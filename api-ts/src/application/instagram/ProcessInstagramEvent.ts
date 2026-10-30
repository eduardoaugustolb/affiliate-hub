import { BadRequestError } from "@/application/errors/BadRequestError";
import { InstagramCampaign } from "@/domain/entities/InstagramCampaign";
import type { DateProvider } from "@/infra/DateProvider";
import type {
	InstagramEvent,
	InstagramGateway,
	InstagramRepository,
	OutfitLinkCatalog,
	SendAction,
	SendOutcome,
} from "./InstagramPorts";

/** Provider acceptance is recorded before a dependent public confirmation can run. */
export class ProcessInstagramEvent {
	constructor(
		private readonly repository: InstagramRepository,
		private readonly gateway: InstagramGateway,
		private readonly outfits: OutfitLinkCatalog,
		private readonly clock: Pick<DateProvider, "now">,
		private readonly accountId: string,
	) {}
	async preview(campaign: InstagramCampaign, text: string) {
		const rule = campaign.match(text);
		if (!rule) return undefined;
		const selected = await Promise.all(
			campaign.selectedOutfits(rule).map(async (outfit) => ({
				...outfit,
				...(await this.outfits.get(outfit.code)),
			})),
		);
		const variables: Record<string, string> =
			rule.target === "all"
				? {
						lista_outfits: selected
							.map((o) => `${o.number} — ${o.name}: ${o.url}`)
							.join("\n"),
					}
				: {
						numero: selected[0]?.number ?? "",
						nome: selected[0]?.name ?? "",
						url: selected[0]?.url ?? "",
					};
		const render = (template: string | undefined) => {
			if (template === undefined) return undefined;
			const text = template.replace(
				/\{([^{}]+)\}/g,
				(_, key: string) => variables[key] ?? "",
			);
			if (!text.trim() || new TextEncoder().encode(text).length > 1000)
				throw new BadRequestError(
					"Rendered Instagram reply exceeds 1000 UTF-8 bytes or is empty",
				);
			return text;
		};
		return {
			rule,
			privateReply: render(rule.privateReply),
			publicReply: render(rule.publicReply),
		};
	}
	async execute(event: InstagramEvent): Promise<string> {
		if (
			event.accountId !== this.accountId ||
			event.senderId === event.accountId
		)
			return "ignored";
		const stored = await this.repository.findCampaign(
			event.accountId,
			event.kind,
			event.mediaId,
		);
		if (!stored) return "ignored";
		const campaign = new InstagramCampaign(stored.configuration);
		if (!campaign.match(event.text)) return "ignored";
		let text = event.text;
		let occurredAt = event.occurredAt;
		if (event.kind === "comment") {
			const comment = await this.gateway.comment(event.externalId);
			if (
				comment.id !== event.externalId ||
				comment.mediaId !== event.mediaId ||
				comment.senderId !== event.senderId
			)
				return "ignored";
			text = comment.text;
			occurredAt = comment.createdAt;
		}
		const eligible = () => {
			const age = this.clock.now().getTime() - occurredAt;
			return (
				Number.isFinite(age) &&
				age >= 0 &&
				age < (event.kind === "comment" ? 7 * 86400000 : 86400000)
			);
		};
		if (!eligible()) return "expired";
		const reply = await this.preview(campaign, text);
		if (!reply) return "ignored";
		const send = async (action: SendAction, text: string) => {
			// Recheck pause/deletion after reads and immediately before reserving an external action.
			const current = await this.repository.findCampaign(
				event.accountId,
				event.kind,
				event.mediaId,
			);
			if (!current || JSON.stringify(current) !== JSON.stringify(stored))
				return "ignored";
			if (!eligible()) return "expired";
			const claim = await this.repository.claimSend(event, action, text);
			if (!claim.claimed)
				return claim.record.status === "inflight"
					? "unknown"
					: claim.record.status;
			if (!eligible()) {
				await this.repository.finishSend(claim.record.key, {
					status: "rejected",
					code: "WINDOW_EXPIRED_BEFORE_SEND",
				});
				return "expired";
			}
			let outcome: SendOutcome;
			try {
				outcome = await this.gateway.send(
					action,
					action === "message" ? event.senderId : event.externalId,
					text,
				);
			} catch {
				outcome = { status: "unknown" as const, code: "TRANSPORT_ERROR" };
			}
			await this.repository.finishSend(claim.record.key, outcome);
			return outcome.status;
		};
		if (reply.privateReply) {
			const status = await send(
				event.kind === "comment" ? "private" : "message",
				reply.privateReply,
			);
			if (status !== "accepted") return status;
		}
		if (reply.publicReply && event.kind === "comment")
			return send("public", reply.publicReply);
		return "accepted";
	}
}
