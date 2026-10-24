import { expect, test } from "bun:test";
import { InstagramRepositoryFake } from "@test/support/fakes/InstagramRepositoryFake";
import { authenticatedSession } from "@test/support/fixtures/authenticatedSession";
import type { InstagramGateway } from "@/application/instagram/InstagramPorts";
import { ManageInstagramCampaigns } from "@/application/instagram/ManageInstagramCampaigns";
import { ProcessInstagramEvent } from "@/application/instagram/ProcessInstagramEvent";

test("requires admin session before resolving any URL, persists canonical post and validates rendered replies", async () => {
	const { authenticator, actor } = await authenticatedSession();
	const repository = new InstagramRepositoryFake();
	let resolved = 0;
	const gateway: InstagramGateway = {
		identity: async () => ({ id: "100", username: "owner" }),
		resolvePost: async () => {
			resolved++;
			return { id: "200", url: "https://www.instagram.com/p/abc/" };
		},
		comment: async () => {
			throw new Error();
		},
		send: async () => {
			throw new Error();
		},
	};
	const outfits = {
		get: async () => ({
			name: "Look",
			url: "https://store.test/o/OUT-AAAAAAAAAAAAAAAA",
		}),
	};
	const preview = new ProcessInstagramEvent(
		repository,
		gateway,
		outfits,
		{ now: () => new Date() },
		"100",
	);
	const service = new ManageInstagramCampaigns(
		"100",
		repository,
		gateway,
		outfits,
		authenticator,
		preview,
	);
	const input = {
		name: "Looks",
		enabled: false,
		source: "comment",
		postUrl: "https://instagram.com/p/abc/?utm_source=ig",
		outfits: [{ number: "01", code: "OUT-AAAAAAAAAAAAAAAA" }],
		rules: [
			{ triggers: ["links"], target: "all", privateReply: "{lista_outfits}" },
		],
	};
	expect(
		service.save({ sessionToken: "" }, "campaign", input),
	).rejects.toThrow();
	await Bun.sleep(0);
	expect(resolved).toBe(0);
	await service.save(actor, "campaign", input);
	expect((await service.list(actor))[0]).toMatchObject({
		mediaId: "200",
		configuration: {
			enabled: false,
			postUrl: "https://www.instagram.com/p/abc/",
		},
	});
	expect(
		await service.preview(actor, { ...input, enabled: true }, "LINKS"),
	).toMatchObject({
		privateReply: "01 — Look: https://store.test/o/OUT-AAAAAAAAAAAAAAAA",
	});
	expect(
		service.save(actor, "other", {
			...input,
			rules: [
				{ triggers: ["links"], target: "all", privateReply: "x".repeat(1001) },
			],
		}),
	).rejects.toThrow();
});
