import { describe, expect, it } from "bun:test";
import { ProductDAOFake } from "@test/support/fakes/ProductDAOFake";
import { ResolveProduct } from "@/application/usecases/queries/ResolveProduct";
import { HonoHttpServerAdapter } from "@/external/http/HonoHttpServerAdapter";
import { ProductResolverRestController } from "@/infra/controllers/http/ProductResolverRestController";
import type { FetchHandler } from "@/infra/http/HttpRestRuntime";
import { HttpMethod } from "@/infra/http/HttpRestServer";

async function setup(status = "active") {
	const repo = new ProductDAOFake();
	await repo.save({
		id: "id",
		name: "Produto",
		code: "A7K2",
		destinationUrl: "https://example.com/affiliate?ref=creator",
		marketplace: "shein",
		imageUrl: "https://example.com/image.jpg",
		status,
	});
	let handler: FetchHandler | undefined;
	const server = new HonoHttpServerAdapter({
		serve: async (fetchHandler) => {
			handler = fetchHandler;
			return { port: 0, stop: async () => {} };
		},
	});
	server.register(HttpMethod.GET, "/health", async (_, res) => res.text("OK"));
	new ProductResolverRestController(server, new ResolveProduct(repo));
	await server.listen(0);
	async function request(path: string) {
		if (!handler) throw new Error("Missing handler");
		return handler(new Request(`http://localhost${path}`));
	}
	return { request };
}

describe("ProductResolverRestController", () => {
	it.each(["/A7K2", "/a7k2", "/resolve?code=%20a7K2%20"])(
		"redirects active codes: %s",
		async (path) => {
			const { request } = await setup();
			const response = await request(path);
			expect(response.status).toBe(302);
			expect(response.headers.get("location")).toBe(
				"https://example.com/affiliate?ref=creator",
			);
			expect(response.headers.get("cache-control")).toBe("no-store");
			expect(await response.text()).toBe("");
		},
	);
	it.each(["/ZZZZ", "/resolve?code=invalid", "/resolve"])(
		"returns JSON 404 without redirecting: %s",
		async (path) => {
			const { request } = await setup();
			const response = await request(path);
			expect(response.status).toBe(404);
			expect(response.headers.get("location")).toBeNull();
			expect(response.headers.get("content-type")).toContain(
				"application/json",
			);
			expect(await response.json()).toMatchObject({
				code: "PRODUCT_NOT_FOUND",
			});
		},
	);
	it("returns JSON 410 for inactive products without redirecting", async () => {
		const { request } = await setup("inactive");
		const response = await request("/A7K2");
		expect(response.status).toBe(410);
		expect(response.headers.get("location")).toBeNull();
		expect(await response.json()).toMatchObject({
			code: "PRODUCT_UNAVAILABLE",
		});
	});
	it("preserves fixed API routes", async () => {
		const { request } = await setup();
		const response = await request("/health");
		expect(response.status).toBe(200);
		expect(await response.text()).toBe("OK");
	});
});
