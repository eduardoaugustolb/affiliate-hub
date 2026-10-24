import type { CampaignConfiguration } from "@/domain/entities/InstagramCampaign";

export type StoredCampaign = {
	id: string;
	accountId: string;
	mediaId: string | null;
	configuration: CampaignConfiguration;
};
export type InstagramEvent = {
	id: string;
	accountId: string;
	kind: "comment" | "message";
	externalId: string;
	senderId: string;
	mediaId: string | null;
	text: string;
	occurredAt: number;
};
export type SendOutcome =
	| { status: "accepted"; externalId: string }
	| { status: "rejected" | "unknown"; code: string };
export type SendAction = "private" | "public" | "message";
export type SendRecord = {
	key: string;
	status: "inflight" | SendOutcome["status"];
	externalId?: string;
	code?: string;
};
export interface InstagramGateway {
	identity(): Promise<{ id: string; username: string }>;
	resolvePost(url: string): Promise<{ id: string; url: string }>;
	comment(id: string): Promise<{
		id: string;
		mediaId: string;
		senderId: string;
		text: string;
		createdAt: number;
	}>;
	send(
		action: SendAction,
		recipient: string,
		text: string,
	): Promise<SendOutcome>;
}
export interface InstagramRepository {
	saveCampaign(campaign: StoredCampaign): Promise<void>;
	listCampaigns(accountId: string): Promise<StoredCampaign[]>;
	removeCampaign(accountId: string, id: string): Promise<void>;
	findCampaign(
		accountId: string,
		kind: InstagramEvent["kind"],
		mediaId: string | null,
	): Promise<StoredCampaign | undefined>;
	enqueue(events: InstagramEvent[]): Promise<void>;
	claimEvent(
		accountId: string,
	): Promise<(InstagramEvent & { claim: string }) | undefined>;
	finishEvent(id: string, claim: string, result: string): Promise<void>;
	retryEvent(id: string, claim: string): Promise<void>;
	claimSend(
		event: InstagramEvent,
		action: SendAction,
		text: string,
	): Promise<{ claimed: boolean; record: SendRecord }>;
	finishSend(key: string, outcome: SendOutcome): Promise<void>;
	history(accountId: string): Promise<unknown[]>;
}
export interface OutfitLinkCatalog {
	get(code: string): Promise<{ name: string; url: string }>;
}
export interface InstagramWebhookVerifier {
	handshake(query: URLSearchParams): string;
	normalize(raw: Uint8Array, signature: string | null): InstagramEvent[];
}
