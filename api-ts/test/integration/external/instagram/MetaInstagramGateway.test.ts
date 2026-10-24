import { expect, test } from "bun:test";
import { MetaInstagramGateway } from "@/external/instagram/MetaInstagramGateway";

const config = { accountId: "123", accessToken: "SECRET", apiVersion: "v26.0" };
test("identity uses canonical user_id and sends bearer credentials only in headers", async () => {
	const gateway = new MetaInstagramGateway(config, async (url, init) => {
		expect(String(url)).not.toContain("SECRET");
		expect(new Headers(init?.headers).get("Authorization")).toBe(
			"Bearer SECRET",
		);
		return Response.json({ user_id: "123", id: "456", username: "owner" });
	});
	expect(await gateway.identity()).toEqual({ id: "123", username: "owner" });
});
test("sending needs a receipt and does not retry ambiguous failures", async () => {
	let calls = 0;
	const gateway = new MetaInstagramGateway(config, async () => {
		calls++;
		return Response.json(
			{ error: { code: 2, message: "SECRET" } },
			{ status: 503 },
		);
	});
	expect(await gateway.send("private", "789", "hello")).toEqual({
		status: "unknown",
		code: "GRAPH_2",
	});
	expect(calls).toBe(1);
});
test("owned media pagination ignores arbitrary next URLs", async () => {
	let calls = 0;
	const gateway = new MetaInstagramGateway(config, async (url) => {
		calls++;
		expect(new URL(String(url)).hostname).toBe("graph.instagram.com");
		return calls === 1
			? Response.json({
					data: [],
					paging: { next: "https://evil.test", cursors: { after: "cursor" } },
				})
			: Response.json({
					data: [{ id: "555", permalink: "https://www.instagram.com/p/abc/" }],
				});
	});
	expect(await gateway.resolvePost("https://instagram.com/p/abc/?x=1")).toEqual(
		{ id: "555", url: "https://www.instagram.com/p/abc/" },
	);
	expect(calls).toBe(2);
});
test("sends official private/public/message shapes and validates receipts", async () => {
	const requests: {
		url: string;
		body: { recipient?: { id?: string; comment_id?: string } };
	}[] = [];
	const gateway = new MetaInstagramGateway(config, async (url, init) => {
		requests.push({ url: String(url), body: JSON.parse(String(init?.body)) });
		return requests.length === 2
			? Response.json({ id: "111" })
			: Response.json({ message_id: "mid.1", recipient_id: "789" });
	});
	expect((await gateway.send("private", "789", "hi")).status).toBe("accepted");
	expect((await gateway.send("public", "789", "hi")).status).toBe("accepted");
	expect((await gateway.send("message", "789", "hi")).status).toBe("accepted");
	expect(requests[0]?.body.recipient).toEqual({ comment_id: "789" });
	expect(requests[1]?.url).toEndWith("/789/replies");
	expect(requests[2]?.body.recipient).toEqual({ id: "789" });
});
test("classifies structured 4xx rejection and malformed success conservatively", async () => {
	const rejected = new MetaInstagramGateway(config, async () =>
		Response.json({ error: { code: 190, message: "SECRET" } }, { status: 400 }),
	);
	expect(await rejected.send("message", "789", "hi")).toEqual({
		status: "rejected",
		code: "GRAPH_190",
	});
	const ambiguous = new MetaInstagramGateway(config, async () =>
		Response.json({ success: true }),
	);
	expect(await ambiguous.send("private", "789", "hi")).toEqual({
		status: "unknown",
		code: "INVALID_RECEIPT",
	});
});
test("network timeout does not retry even when transport ignores abort", async () => {
	let calls = 0;
	const gateway = new MetaInstagramGateway(
		{ ...config, timeoutMs: 2 },
		async () => {
			calls++;
			return new Promise(() => {});
		},
	);
	expect(await gateway.send("private", "789", "hi")).toEqual({
		status: "unknown",
		code: "TIMEOUT",
	});
	expect(calls).toBe(1);
});
test("comment uses authoritative timestamp and numeric identifiers", async () => {
	const gateway = new MetaInstagramGateway(config, async () =>
		Response.json({
			id: "456",
			media: { id: "555" },
			from: { id: "789" },
			text: "hi",
			timestamp: "2026-10-24T12:00:00Z",
		}),
	);
	expect(await gateway.comment("456")).toMatchObject({
		createdAt: Date.parse("2026-10-24T12:00:00Z"),
		senderId: "789",
		mediaId: "555",
	});
	expect(gateway.comment("../me")).rejects.toThrow();
});

test("rejects app-scoped identity substituted for canonical account ID", async () => {
	const gateway = new MetaInstagramGateway(config, async () =>
		Response.json({ user_id: "456", id: "123", username: "owner" }),
	);
	expect(gateway.identity()).rejects.toThrow();
});
test("accepts wrapped canonical identity and rejects ambiguous mixed identity", async () => {
	const wrapped = new MetaInstagramGateway(config, async () =>
		Response.json({ data: [{ user_id: "123", id: "456", username: "owner" }] }),
	);
	expect(await wrapped.identity()).toEqual({ id: "123", username: "owner" });
	const ambiguous = new MetaInstagramGateway(config, async () =>
		Response.json({
			user_id: "999",
			data: [{ user_id: "123", username: "owner" }],
		}),
	);
	expect(ambiguous.identity()).rejects.toThrow();
});
test("rejects success receipts addressed to a different message recipient", async () => {
	const gateway = new MetaInstagramGateway(config, async () =>
		Response.json({ message_id: "mid.1", recipient_id: "999" }),
	);
	expect(await gateway.send("message", "789", "hi")).toEqual({
		status: "unknown",
		code: "INVALID_RECEIPT",
	});
});
