import { expect, test } from "bun:test";
import { storefrontFixture } from "@test/support/fixtures/storefront";
import { HonoHttpServerAdapter } from "@/external/http/HonoHttpServerAdapter";
import { StorefrontRestController } from "@/infra/controllers/http/StorefrontRestController";
import type { FetchHandler } from "@/infra/http/HttpRestRuntime";

test("storefront GETs work without a session and map missing entries to 404", async () => {
	const { entries } = await storefrontFixture();
	let handler: FetchHandler | undefined;
	const server = new HonoHttpServerAdapter({
		serve: async (fetch) => {
			handler = fetch;
			return { port: 0, stop: async () => {} };
		},
	});
	new StorefrontRestController(server, entries);
	await server.listen(0);
	if (!handler) throw new Error("Missing handler");
	for (const [path, status] of [
		["/storefront/products/ABC234", 200],
		["/storefront/outfits/OUT-AAAAAAAAAAAAAAAA", 200],
		["/storefront/products/ZZZZ", 404],
		["/storefront/outfits/OUT-BBBBBBBBBBBBBBBB", 404],
	] as const) {
		const response = await handler(new Request(`http://localhost${path}`));
		expect(response.status).toBe(status);
		if (status === 200) {
			expect(response.headers.get("cache-control")).toBe("no-store");
			expect(await response.json()).not.toHaveProperty("id");
		}
	}
});

test("public product exposes multiple colors and its ordered gallery", async () => {
	const { entries, products, catalog } = await storefrontFixture();
	const product = await products.findByCode({ code: "ABC234" });
	if (!product) throw new Error("Missing product");
	const imageUrls: [string, string] = [
		"https://example.com/red.jpg",
		"https://example.com/blue.jpg",
	];
	await products.update({ ...product, imageUrl: imageUrls[0], imageUrls });
	catalog.getProductOptions = async () => ["red", "blue"];
	const result = await entries.product("ABC234");
	expect(result.colors.map((color) => color.name)).toEqual([
		"Vermelho",
		"Azul",
	]);
	expect(result.imageUrls).toEqual(imageUrls);
	expect(result.imageUrl).toBe(imageUrls[0]);
});
