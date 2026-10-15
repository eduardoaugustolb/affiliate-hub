import { afterAll, beforeAll, describe, expect, it } from "bun:test";
import { BunRuntimeAdapter } from "@/external/http/BunRuntimeAdapter";
import { FetchHttpClientAdapter } from "@/external/http/FetchHttpClientAdapter";
import type { RunningRestServer } from "@/infra/http/HttpRestRuntime";

describe("FetchHttpClientAdapter", () => {
	const client = new FetchHttpClientAdapter();
	let server: RunningRestServer;
	let baseUrl: string;

	beforeAll(async () => {
		server = await new BunRuntimeAdapter().serve(
			async (request) => {
				const path = new URL(request.url).pathname;
				if (path === "/empty") return new Response(null, { status: 204 });
				if (path === "/text") return new Response("OK");
				const headers = new Headers({ "Content-Type": "application/json" });
				headers.append("Set-Cookie", "session=abc; HttpOnly; Path=/");
				headers.append("Set-Cookie", "preference=dark; Path=/");
				return new Response(
					JSON.stringify({
						method: request.method,
						cookie: request.headers.get("cookie"),
						contentType: request.headers.get("content-type"),
						body: await request.text(),
					}),
					{ status: 200, headers },
				);
			},
			{ port: 0 },
		);
		baseUrl = `http://localhost:${server.port}`;
	});

	afterAll(async () => {
		await server?.stop();
	});

	it.each(["get", "post", "put", "delete"] as const)(
		"%s forwards headers and preserves separate cookies",
		async (method) => {
			const options = { headers: { Cookie: "session=abc" }, timeoutMs: 5000 };
			const response =
				method === "post" || method === "put"
					? await client[method](baseUrl, { name: "Test" }, options)
					: await client[method](baseUrl, options);
			expect(response.statusCode).toBe(200);
			expect(response.body).toEqual({
				method: method.toUpperCase(),
				cookie: "session=abc",
				contentType:
					method === "post" || method === "put" ? "application/json" : null,
				body:
					method === "post" || method === "put"
						? JSON.stringify({ name: "Test" })
						: "",
			});
			expect(response.headers["content-type"]).toBe("application/json");
			expect(response.cookies).toEqual([
				"session=abc; HttpOnly; Path=/",
				"preference=dark; Path=/",
			]);
		},
	);

	it("supports empty responses", async () => {
		const response = await client.get(`${baseUrl}/empty`);
		expect(response.statusCode).toBe(204);
		expect(response.body).toBeUndefined();
		expect(response.cookies).toEqual([]);
	});

	it("supports plain text responses", async () => {
		expect((await client.get(`${baseUrl}/text`)).body).toBe("OK");
	});
});
