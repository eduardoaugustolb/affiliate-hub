import { BadRequestError } from "@/application/errors/BadRequestError";
import { ForbiddenOperationError } from "@/application/errors/ForbiddenOperationError";
import type {
	SessionActor,
	SessionAuthenticator,
} from "@/application/SessionAuthenticator";
import {
	type CampaignConfiguration,
	InstagramCampaign,
} from "@/domain/entities/InstagramCampaign";
import { DomainError } from "@/domain/errors/DomainError";
import type {
	InstagramGateway,
	InstagramRepository,
	OutfitLinkCatalog,
	StoredCampaign,
} from "./InstagramPorts";
import type { ProcessInstagramEvent } from "./ProcessInstagramEvent";

export class ManageInstagramCampaigns {
	constructor(
		private readonly accountId: string,
		private readonly repository: InstagramRepository,
		private readonly gateway: InstagramGateway,
		private readonly outfits: OutfitLinkCatalog,
		private readonly authenticator: SessionAuthenticator,
		private readonly processor: ProcessInstagramEvent,
	) {}
	private async authorize(actor: SessionActor) {
		if ((await this.authenticator.authenticate(actor)).getRole() !== "admin")
			throw new ForbiddenOperationError("Only admins can manage Instagram");
	}
	private parse(input: unknown) {
		if (!input || typeof input !== "object" || Array.isArray(input))
			throw new BadRequestError("Invalid Instagram campaign payload");
		try {
			return new InstagramCampaign(input as CampaignConfiguration);
		} catch (error) {
			if (error instanceof DomainError)
				throw new BadRequestError(error.message);
			throw error;
		}
	}
	async list(actor: SessionActor) {
		await this.authorize(actor);
		return this.repository.listCampaigns(this.accountId);
	}
	async status(actor: SessionActor) {
		await this.authorize(actor);
		return { ...(await this.gateway.identity()), configured: true };
	}
	async history(actor: SessionActor) {
		await this.authorize(actor);
		return this.repository.history(this.accountId);
	}
	async save(
		actor: SessionActor,
		id: string,
		input: unknown,
	): Promise<StoredCampaign> {
		await this.authorize(actor);
		if (!/^[a-zA-Z0-9_-]{1,100}$/.test(id))
			throw new BadRequestError("Invalid campaign ID");
		const campaign = this.parse(input);
		for (const outfit of campaign.toJSON().outfits)
			await this.outfits.get(outfit.code);
		// Render every branch before saving so an oversized list cannot be activated.
		const enabled = new InstagramCampaign({
			...campaign.toJSON(),
			enabled: true,
		});
		for (const rule of enabled.toJSON().rules)
			await this.processor.preview(enabled, rule.triggers[0] ?? "");
		const configuration = campaign.toJSON();
		const media = configuration.postUrl
			? await this.gateway.resolvePost(configuration.postUrl)
			: null;
		if (media) configuration.postUrl = media.url;
		const stored = {
			id,
			accountId: this.accountId,
			mediaId: media?.id ?? null,
			configuration,
		};
		await this.repository.saveCampaign(stored);
		return stored;
	}
	async remove(actor: SessionActor, id: string) {
		await this.authorize(actor);
		await this.repository.removeCampaign(this.accountId, id);
	}
	async preview(actor: SessionActor, input: unknown, text: unknown) {
		await this.authorize(actor);
		if (typeof text !== "string" || text.length > 4000)
			throw new BadRequestError("Invalid sample text");
		const campaign = this.parse(input);
		return (
			(await this.processor.preview(
				new InstagramCampaign({ ...campaign.toJSON(), enabled: true }),
				text,
			)) ?? { matched: false }
		);
	}
}
