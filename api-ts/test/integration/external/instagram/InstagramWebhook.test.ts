import { expect, test } from "bun:test";
import { createHmac } from "node:crypto";
import { InstagramWebhook } from "@/external/instagram/InstagramWebhook";

const webhook = new InstagramWebhook(
	{ accountId: "123", appSecret: "secret", verifyToken: "verify" },
	() => 100000,
);
function signed(payload: unknown) {
	const raw = new TextEncoder().encode(JSON.stringify(payload));
	return {
		raw,
		signature: `sha256=${createHmac("sha256", "secret").update(raw).digest("hex")}`,
	};
}
test("normalizes both signed comment envelopes and deduplicates IDs", () => {
	const value = {
		id: "456",
		from: { id: "789" },
		media: { id: "999" },
		text: "look",
	};
	const { raw, signature } = signed({
		object: "instagram",
		entry: [
			{ id: "123", field: "comments", value },
			{ id: "123", changes: [{ field: "comments", value }] },
		],
	});
	const events = webhook.normalize(raw, signature);
	expect(events).toHaveLength(1);
	expect(events[0]).toMatchObject({
		externalId: "456",
		occurredAt: 100000,
		kind: "comment",
	});
});
test("requires signed bytes and rejects malformed payload", () => {
	const { raw, signature } = signed({ object: "instagram", entry: [] });
	expect(() => webhook.normalize(raw, `${signature}a`)).toThrow();
	expect(() =>
		webhook.normalize(new TextEncoder().encode("{"), signature),
	).toThrow();
});
test("only accepts own inbound messages and preserves signed milliseconds", () => {
	const { raw, signature } = signed({
		object: "instagram",
		entry: [
			{
				id: "123",
				messaging: [
					{
						sender: { id: "789" },
						recipient: { id: "123" },
						timestamp: 99999,
						message: { mid: "mid.a", text: "hello" },
					},
					{
						sender: { id: "123" },
						recipient: { id: "789" },
						timestamp: 99999,
						message: { mid: "echo", text: "hi", is_echo: true },
					},
				],
			},
		],
	});
	expect(webhook.normalize(raw, signature)).toEqual([
		expect.objectContaining({ externalId: "mid.a", occurredAt: 99999 }),
	]);
});
test("handshake requires single matching query values", () => {
	expect(
		webhook.handshake(
			new URLSearchParams(
				"hub.mode=subscribe&hub.verify_token=verify&hub.challenge=123",
			),
		),
	).toBe("123");
	expect(() =>
		webhook.handshake(
			new URLSearchParams(
				"hub.mode=subscribe&hub.verify_token=verify&hub.verify_token=other&hub.challenge=123",
			),
		),
	).toThrow();
});
test("ignores foreign account, self comments and live comments", () => {
	const value = {
		id: "456",
		from: { id: "789" },
		media: { id: "999" },
		text: "hi",
	};
	const { raw, signature } = signed({
		object: "instagram",
		entry: [
			{ id: "321", field: "comments", value },
			{
				id: "123",
				changes: [
					{ field: "comments", value: { ...value, from: { id: "123" } } },
					{ field: "live_comments", value },
				],
			},
		],
	});
	expect(webhook.normalize(raw, signature)).toEqual([]);
});
test("rejects signed malformed content and excessive entries", () => {
	for (const payload of [
		{
			object: "instagram",
			entry: [{ id: "123", changes: [{ field: "comments", value: {} }] }],
		},
		{
			object: "instagram",
			entry: Array.from({ length: 101 }, () => ({ id: "123" })),
		},
	]) {
		const { raw, signature } = signed(payload);
		expect(() => webhook.normalize(raw, signature)).toThrow();
	}
});
