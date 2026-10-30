import { expect, test } from "bun:test";
import { InstagramRepositoryFake } from "@test/support/fakes/InstagramRepositoryFake";
import type {
	InstagramEvent,
	InstagramGateway,
	OutfitLinkCatalog,
	SendAction,
	SendOutcome,
	StoredCampaign,
} from "@/application/instagram/InstagramPorts";
import { ProcessInstagramEvent } from "@/application/instagram/ProcessInstagramEvent";

function fixture(kind: "comment" | "message" = "comment") {
	let now = 1800000000000;
	const started = now;
	const repository = new InstagramRepositoryFake();
	const campaign: StoredCampaign = {
		id: "campaign",
		accountId: "100",
		mediaId: kind === "comment" ? "200" : null,
		configuration: {
			name: "Looks",
			enabled: true,
			source: kind,
			postUrl: kind === "comment" ? "https://instagram.com/p/abc/" : null,
			outfits: [{ number: "01", code: "OUT-AAAAAAAAAAAAAAAA" }],
			rules: [
				{
					triggers: ["links"],
					target: "all",
					privateReply: "{lista_outfits}",
					...(kind === "comment" ? { publicReply: "Enviei!" } : {}),
				},
			],
		},
	};
	repository.campaigns.push(campaign);
	const event: InstagramEvent = {
		id: "event",
		accountId: "100",
		kind,
		externalId: "300",
		senderId: "400",
		mediaId: campaign.mediaId,
		text: "links",
		occurredAt: now,
	};
	const sends: SendAction[] = [];
	let outcome: (action: SendAction) => SendOutcome = () => ({
		status: "accepted",
		externalId: "receipt",
	});
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
			createdAt: started,
		}),
		send: async (action) => {
			sends.push(action);
			return outcome(action);
		},
	};
	const catalog: OutfitLinkCatalog = {
		get: async () => ({ name: "Look", url: "https://shop.test/outfit" }),
	};
	const processor = new ProcessInstagramEvent(
		repository,
		gateway,
		catalog,
		{ now: () => new Date(now) },
		"100",
	);
	return {
		repository,
		campaign,
		event,
		sends,
		gateway,
		catalog,
		processor,
		advance: (ms: number) => {
			now += ms;
		},
		outcome: (fn: typeof outcome) => {
			outcome = fn;
		},
	};
}
test("foreign account cannot send despite matching persisted campaign", async () => {
	const f = fixture();
	f.event.accountId = "999";
	f.campaign.accountId = "999";
	expect(await f.processor.execute(f.event)).toBe("ignored");
	expect(f.sends).toEqual([]);
	expect(f.repository.sends.size).toBe(0);
});
test("DM window expiring during catalog read does not reserve or send", async () => {
	const f = fixture("message");
	f.catalog.get = async () => {
		f.advance(86400000);
		return { name: "Look", url: "https://shop.test/outfit" };
	};
	expect(await f.processor.execute(f.event)).toBe("expired");
	expect(f.sends).toEqual([]);
	expect(f.repository.sends.size).toBe(0);
});
test("DM window expiring during claim records conclusive unsent rejection", async () => {
	const f = fixture("message");
	const claim = f.repository.claimSend.bind(f.repository);
	f.repository.claimSend = async (...args) => {
		const result = await claim(...args);
		f.advance(86400000);
		return result;
	};
	expect(await f.processor.execute(f.event)).toBe("expired");
	expect(f.sends).toEqual([]);
	expect([...f.repository.sends.values()]).toEqual([
		expect.objectContaining({
			status: "rejected",
			code: "WINDOW_EXPIRED_BEFORE_SEND",
		}),
	]);
});
test("public failure reprocessing never repeats accepted private delivery", async () => {
	for (const status of ["unknown", "rejected"] as const) {
		const f = fixture();
		f.outcome((action) =>
			action === "private"
				? { status: "accepted", externalId: "private-receipt" }
				: { status, code: "PUBLIC_FAILED" },
		);
		expect(await f.processor.execute(f.event)).toBe(status);
		expect(await f.processor.execute(f.event)).toBe(status);
		expect(f.sends).toEqual(["private", "public"]);
	}
});
test("pause or deletion during catalog read prevents external actions", async () => {
	for (const mode of ["pause", "delete"] as const) {
		const f = fixture();
		f.catalog.get = async () => {
			if (mode === "pause")
				await f.repository.saveCampaign({
					...f.campaign,
					configuration: { ...f.campaign.configuration, enabled: false },
				});
			else await f.repository.removeCampaign("100", "campaign");
			return { name: "Look", url: "https://shop.test/outfit" };
		};
		expect(await f.processor.execute(f.event)).toBe("ignored");
		expect(f.sends).toEqual([]);
		expect(f.repository.sends.size).toBe(0);
	}
});
test("oversized rendered outfit list never reserves or sends", async () => {
	const f = fixture();
	f.catalog.get = async () => ({
		name: "x".repeat(1001),
		url: "https://shop.test/outfit",
	});
	expect(f.processor.execute(f.event)).rejects.toThrow("1000 UTF-8 bytes");
	await Promise.resolve();
	expect(f.sends).toEqual([]);
	expect(f.repository.sends.size).toBe(0);
});
test("canonical comment edited away from signed trigger does not send", async () => {
	const f = fixture();
	f.gateway.comment = async () => ({
		id: "300",
		mediaId: "200",
		senderId: "400",
		text: "unrelated",
		createdAt: f.event.occurredAt,
	});
	expect(await f.processor.execute(f.event)).toBe("ignored");
	expect(f.sends).toEqual([]);
});
