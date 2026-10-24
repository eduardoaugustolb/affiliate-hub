import { DomainError } from "@/domain/errors/DomainError";

export type InstagramRule = {
	triggers: string[];
	target: string;
	privateReply?: string;
	publicReply?: string;
};
export type CampaignConfiguration = {
	name: string;
	enabled: boolean;
	source: "comment" | "message";
	postUrl: string | null;
	outfits: { number: string; code: string }[];
	rules: InstagramRule[];
};

export function normalizeTrigger(text: string): string {
	return text.trim().replace(/\s+/gu, " ").toLocaleLowerCase("pt-BR");
}

export function instagramPostUrl(input: string): string {
	let url: URL;
	try {
		url = new URL(input);
	} catch {
		throw new DomainError("Invalid Instagram post URL");
	}
	if (
		url.protocol !== "https:" ||
		!["instagram.com", "www.instagram.com"].includes(url.hostname) ||
		url.port ||
		url.username ||
		url.password ||
		!/^\/(p|reel)\/[A-Za-z0-9_-]+\/?$/.test(url.pathname)
	)
		throw new DomainError("Expected an Instagram post or reel URL");
	return `https://www.instagram.com${url.pathname.replace(/\/$/, "")}/`;
}

/** A campaign owns the numbering and exact expressions for one post or the account inbox. */
export class InstagramCampaign {
	private readonly configuration: CampaignConfiguration;
	constructor(input: CampaignConfiguration) {
		if (
			typeof input?.name !== "string" ||
			!input.name.trim() ||
			input.name.length > 160 ||
			typeof input.enabled !== "boolean" ||
			!["comment", "message"].includes(input.source)
		)
			throw new DomainError("Invalid campaign");
		if (
			!Array.isArray(input.outfits) ||
			input.outfits.length > 30 ||
			!Array.isArray(input.rules) ||
			!input.rules.length ||
			input.rules.length > 50
		)
			throw new DomainError("Expected up to 30 outfits and 1 to 50 rules");
		const numbers = new Set<string>();
		for (const outfit of input.outfits) {
			if (
				!outfit ||
				typeof outfit.number !== "string" ||
				typeof outfit.code !== "string" ||
				!/^\d{2}$/.test(outfit.number) ||
				outfit.number === "00" ||
				!/^OUT-[A-F0-9]{16}$/.test(outfit.code) ||
				numbers.has(outfit.number)
			)
				throw new DomainError("Invalid or duplicate outfit number");
			numbers.add(outfit.number);
		}
		const triggers = new Set<string>();
		for (const rule of input.rules) {
			if (
				!rule ||
				typeof rule.target !== "string" ||
				!Array.isArray(rule.triggers) ||
				!rule.triggers.length ||
				rule.triggers.length > 30 ||
				(rule.target !== "all" && !numbers.has(rule.target))
			)
				throw new DomainError("Invalid rule target or triggers");
			if (!rule.privateReply && !rule.publicReply)
				throw new DomainError("A rule needs a reply action");
			if (
				input.source === "message" &&
				(!rule.privateReply || rule.publicReply)
			)
				throw new DomainError("Inbox rules must reply privately");
			for (const trigger of rule.triggers) {
				if (
					typeof trigger !== "string" ||
					!trigger.trim() ||
					trigger.length > 160 ||
					triggers.has(normalizeTrigger(trigger))
				)
					throw new DomainError("Invalid or conflicting trigger");
				triggers.add(normalizeTrigger(trigger));
			}
			for (const template of [rule.privateReply, rule.publicReply]) {
				if (template === undefined) continue;
				if (
					typeof template !== "string" ||
					!template.trim() ||
					new TextEncoder().encode(template).length > 1000
				)
					throw new DomainError("Reply must contain 1 to 1000 UTF-8 bytes");
				const allowed =
					rule.target === "all" ? ["lista_outfits"] : ["numero", "nome", "url"];
				if (
					/\{[^{}]*\}/g.test(
						template.replace(/\{([^{}]+)\}/g, (match, key: string) =>
							allowed.includes(key) ? "" : match,
						),
					)
				)
					throw new DomainError("Unknown template variable for this target");
				if (/[{}]/.test(template.replace(/\{[^{}]+\}/g, "")))
					throw new DomainError("Invalid template variable");
				if (template.includes("{") && !input.outfits.length)
					throw new DomainError("Outfit variables need configured outfits");
			}
		}
		if (input.source === "comment" && typeof input.postUrl !== "string")
			throw new DomainError("Comment campaigns need a post URL");
		if (input.source === "message" && input.postUrl !== null)
			throw new DomainError("Inbox campaigns have no post URL");
		this.configuration = {
			name: input.name.trim(),
			enabled: input.enabled,
			source: input.source,
			postUrl: input.postUrl === null ? null : instagramPostUrl(input.postUrl),
			outfits: input.outfits.map(({ number, code }) => ({ number, code })),
			rules: input.rules.map(
				({ triggers, target, privateReply, publicReply }) => ({
					triggers: [...triggers],
					target,
					...(privateReply !== undefined ? { privateReply } : {}),
					...(publicReply !== undefined ? { publicReply } : {}),
				}),
			),
		};
	}
	toJSON(): CampaignConfiguration {
		return structuredClone(this.configuration);
	}
	match(text: string): InstagramRule | undefined {
		if (!this.configuration.enabled) return undefined;
		const rule = this.configuration.rules.find((rule) =>
			rule.triggers.some(
				(trigger) => normalizeTrigger(trigger) === normalizeTrigger(text),
			),
		);
		return rule ? structuredClone(rule) : undefined;
	}
	selectedOutfits(rule: InstagramRule) {
		return this.configuration.outfits
			.filter(
				(outfit) => rule.target === "all" || outfit.number === rule.target,
			)
			.map((outfit) => ({ ...outfit }));
	}
}
