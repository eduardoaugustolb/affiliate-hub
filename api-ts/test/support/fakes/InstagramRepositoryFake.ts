import type {
	InstagramEvent,
	InstagramRepository,
	SendAction,
	SendOutcome,
	SendRecord,
	StoredCampaign,
} from "@/application/instagram/InstagramPorts";

export class InstagramRepositoryFake implements InstagramRepository {
	campaigns: StoredCampaign[] = [];
	events = new Map<string, InstagramEvent>();
	sends = new Map<string, SendRecord>();
	results = new Map<string, string>();
	async saveCampaign(campaign: StoredCampaign) {
		this.campaigns = this.campaigns.filter((c) => c.id !== campaign.id);
		this.campaigns.push(campaign);
	}
	async listCampaigns(accountId: string) {
		return this.campaigns.filter((c) => c.accountId === accountId);
	}
	async removeCampaign(accountId: string, id: string) {
		this.campaigns = this.campaigns.filter(
			(c) => c.id !== id || c.accountId !== accountId,
		);
	}
	async findCampaign(
		accountId: string,
		kind: InstagramEvent["kind"],
		mediaId: string | null,
	) {
		return this.campaigns.find(
			(c) =>
				c.accountId === accountId &&
				c.configuration.source === kind &&
				c.mediaId === mediaId,
		);
	}
	async enqueue(events: InstagramEvent[]) {
		for (const event of events)
			if (!this.events.has(event.id)) this.events.set(event.id, event);
	}
	async claimEvent(accountId: string) {
		const event = [...this.events.values()].find(
			(e) => e.accountId === accountId && !this.results.has(e.id),
		);
		return event ? { ...event, claim: "claim" } : undefined;
	}
	async finishEvent(id: string, _claim: string, result: string) {
		this.results.set(id, result);
	}
	async retryEvent() {}
	async claimSend(event: InstagramEvent, action: SendAction, _text: string) {
		const key = `${event.accountId}:${event.kind}:${event.externalId}:${action}`;
		const existing = this.sends.get(key);
		if (existing) return { claimed: false, record: existing };
		const record: SendRecord = { key, status: "inflight" };
		this.sends.set(key, record);
		return { claimed: true, record };
	}
	async finishSend(key: string, outcome: SendOutcome) {
		this.sends.set(key, { key, ...outcome });
	}
	async history() {
		return [...this.results];
	}
}
