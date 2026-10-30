import { expect, test } from "bun:test";
import { createHmac } from "node:crypto";
import { InstagramRepositoryFake } from "@test/support/fakes/InstagramRepositoryFake";
import { authenticatedSession } from "@test/support/fixtures/authenticatedSession";
import type { InstagramGateway } from "@/application/instagram/InstagramPorts";
import { InstagramWorker } from "@/application/instagram/InstagramWorker";
import { ManageInstagramCampaigns } from "@/application/instagram/ManageInstagramCampaigns";
import { ProcessInstagramEvent } from "@/application/instagram/ProcessInstagramEvent";
import { HonoHttpServerAdapter } from "@/external/http/HonoHttpServerAdapter";
import { InstagramWebhook } from "@/external/instagram/InstagramWebhook";
import { InstagramRestController } from "@/infra/controllers/http/InstagramRestController";
import type { FetchHandler } from "@/infra/http/HttpRestRuntime";

test("admin config → signed webhook → durable inbox → worker → accepted DM; invalid signature never enqueues", async () => {
	const { authenticator } = await authenticatedSession();
	const repository = new InstagramRepositoryFake();
	const sends: string[] = [];
	const gateway: InstagramGateway = {
		identity: async () => ({ id: "100", username: "owner" }),
		resolvePost: async () => ({
			id: "200",
			url: "https://www.instagram.com/p/abc/",
		}),
		comment: async () => ({
			id: "300",
			mediaId: "200",
			senderId: "400",
			text: "links",
			createdAt: Date.now() - 1000,
		}),
		send: async (_action, _recipient, text) => {
			sends.push(text);
			return { status: "accepted", externalId: "receipt" };
		},
	};
	const outfits = {
		get: async () => ({
			name: "Look",
			url: "https://store.test/o/OUT-AAAAAAAAAAAAAAAA",
		}),
	};
	const processor = new ProcessInstagramEvent(
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
		processor,
	);
	let fetch: FetchHandler | undefined;
	const server = new HonoHttpServerAdapter({
		serve: async (handler) => {
			fetch = handler;
			return { port: 0, stop: async () => {} };
		},
	});
	new InstagramRestController(
		server,
		service,
		repository,
		new InstagramWebhook({
			accountId: "100",
			appSecret: "secret",
			verifyToken: "verify",
		}),
		"session",
	);
	await server.listen(0);
	if (!fetch) throw new Error("No HTTP handler");
	const config = {
		name: "Looks",
		source: "comment",
		enabled: true,
		postUrl: "https://instagram.com/p/abc/",
		outfits: [{ number: "01", code: "OUT-AAAAAAAAAAAAAAAA" }],
		rules: [
			{ triggers: ["links"], target: "all", privateReply: "{lista_outfits}" },
		],
	};
	const url = "http://localhost/integrations/instagram/campaigns/campaign";
	expect(
		(
			await fetch(
				new Request(url, { method: "PUT", body: JSON.stringify(config) }),
			)
		).status,
	).toBe(401);
	expect(
		(
			await fetch(
				new Request(url, {
					method: "PUT",
					headers: { cookie: "session=session-token" },
					body: JSON.stringify(config),
				}),
			)
		).status,
	).toBe(200);
	const raw = JSON.stringify({
		object: "instagram",
		entry: [
			{
				id: "100",
				changes: [
					{
						field: "comments",
						value: {
							id: "300",
							text: "links",
							from: { id: "400" },
							media: { id: "200" },
						},
					},
				],
			},
		],
	});
	const webhook = "http://localhost/webhooks/instagram";
	expect(
		(await fetch(new Request(webhook, { method: "POST", body: raw }))).status,
	).toBe(403);
	expect(repository.events.size).toBe(0);
	const signed = () =>
		new Request(webhook, {
			method: "POST",
			body: raw,
			headers: {
				"x-hub-signature-256": `sha256=${createHmac("sha256", "secret").update(raw).digest("hex")}`,
			},
		});
	expect((await fetch(signed())).status).toBe(200);
	await fetch(signed());
	expect(repository.events.size).toBe(1);
	await new InstagramWorker("100", repository, processor).tick();
	expect(sends).toEqual([
		"01 — Look: https://store.test/o/OUT-AAAAAAAAAAAAAAAA",
	]);
	expect(
		(
			await fetch(
				new Request(
					`${webhook}?hub.mode=subscribe&hub.verify_token=verify&hub.challenge=123`,
				),
			)
		).status,
	).toBe(200);
	expect(
		(await fetch(new Request(webhook, { method: "POST", body: "not json" })))
			.status,
	).toBe(403);
});
