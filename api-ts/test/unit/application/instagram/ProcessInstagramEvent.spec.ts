import { expect, test } from "bun:test";
import { InstagramRepositoryFake } from "@test/support/fakes/InstagramRepositoryFake";
import type {
	InstagramEvent,
	InstagramGateway,
	SendAction,
	SendOutcome,
	StoredCampaign,
} from "@/application/instagram/InstagramPorts";
import { ProcessInstagramEvent } from "@/application/instagram/ProcessInstagramEvent";

function fixture() {
	const now = Date.now();
	const repository = new InstagramRepositoryFake();
	const campaign: StoredCampaign = {
		id: "campaign",
		accountId: "100",
		mediaId: "200",
		configuration: {
			name: "Looks",
			enabled: true,
			source: "comment",
			postUrl: "https://instagram.com/p/abc/",
			outfits: [{ number: "01", code: "OUT-AAAAAAAAAAAAAAAA" }],
			rules: [
				{
					triggers: ["links", "link 01"],
					target: "all",
					privateReply: "{lista_outfits}",
					publicReply: "Enviei!",
				},
			],
		},
	};
	repository.campaigns.push(campaign);
	const event: InstagramEvent = {
		id: "event",
		accountId: "100",
		kind: "comment",
		externalId: "300",
		senderId: "400",
		mediaId: "200",
		text: "links",
		occurredAt: now,
	};
	const sends: { action: SendAction; text: string }[] = [];
	let outcome: SendOutcome = { status: "accepted", externalId: "sent" };
	const gateway: InstagramGateway = {
		identity: async () => ({ id: "100", username: "owner" }),
		resolvePost: async () => ({
			id: "200",
			url: "https://instagram.com/p/abc/",
		}),
		comment: async () => ({
			id: "300",
			mediaId: "200",
			senderId: "400",
			text: "links",
			createdAt: now,
		}),
		send: async (action, _recipient, text) => {
			sends.push({ action, text });
			return outcome;
		},
	};
	const processor = new ProcessInstagramEvent(
		repository,
		gateway,
		{
			get: async () => ({
				name: "Look",
				url: "https://store.test/o/OUT-AAAAAAAAAAAAAAAA",
			}),
		},
		{ now: () => new Date(now) },
		"100",
	);
	return {
		repository,
		gateway,
		processor,
		event,
		campaign,
		sends,
		now,
		setOutcome: (value: SendOutcome) => {
			outcome = value;
		},
	};
}

test("sends outfit links before public confirmation and deduplicates across reprocessing", async () => {
	const f = fixture();
	expect(await f.processor.execute(f.event)).toBe("accepted");
	expect(f.sends.map((s) => s.action)).toEqual(["private", "public"]);
	expect(f.sends[0]?.text).toContain("01 — Look: https://store.test/o/");
	await f.processor.execute(f.event);
	expect(f.sends).toHaveLength(2);
});
test("uncertain private sends block public confirmation and are never retried automatically", async () => {
	const f = fixture();
	f.setOutcome({ status: "unknown", code: "TIMEOUT" });
	expect(await f.processor.execute(f.event)).toBe("unknown");
	await f.processor.execute(f.event);
	expect(f.sends).toHaveLength(1);
});
test("ignores unmonitored posts, paused rules and own comments", async () => {
	for (const change of [
		(f: ReturnType<typeof fixture>) => {
			f.event.mediaId = "999";
		},
		(f: ReturnType<typeof fixture>) => {
			f.campaign.configuration.enabled = false;
		},
		(f: ReturnType<typeof fixture>) => {
			f.event.senderId = "100";
		},
	]) {
		const f = fixture();
		change(f);
		expect(await f.processor.execute(f.event)).toBe("ignored");
		expect(f.sends).toHaveLength(0);
	}
});
test("uses canonical comment creation time rather than webhook receipt time", async () => {
	const f = fixture();
	f.gateway.comment = async () => ({
		id: "300",
		mediaId: "200",
		senderId: "400",
		text: "links",
		createdAt: f.now - 8 * 86400000,
	});
	expect(await f.processor.execute(f.event)).toBe("expired");
	expect(f.sends).toHaveLength(0);
});
test("rejects a comment belonging to a different media or author", async () => {
	const f = fixture();
	f.gateway.comment = async () => ({
		id: "300",
		mediaId: "999",
		senderId: "400",
		text: "links",
		createdAt: f.now,
	});
	expect(await f.processor.execute(f.event)).toBe("ignored");
	expect(f.sends).toHaveLength(0);
});
test("DM rules use explicit configured outfits and enforce the 24-hour window", async () => {
	const f = fixture();
	f.campaign.configuration.source = "message";
	f.campaign.configuration.postUrl = null;
	f.campaign.mediaId = null;
	delete f.campaign.configuration.rules[0]?.publicReply;
	f.event.kind = "message";
	f.event.mediaId = null;
	expect(await f.processor.execute(f.event)).toBe("accepted");
	expect(f.sends[0]?.action).toBe("message");
	f.event.externalId = "other";
	f.event.occurredAt = f.now - 86400000;
	expect(await f.processor.execute(f.event)).toBe("expired");
	expect(f.sends).toHaveLength(1);
});
