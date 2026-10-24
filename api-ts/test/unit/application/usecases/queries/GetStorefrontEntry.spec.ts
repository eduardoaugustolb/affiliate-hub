import { expect, test } from "bun:test";
import { storefrontFixture } from "@test/support/fixtures/storefront";

test("public product projection returns associated colors without internal IDs or timestamps", async () => {
	const { entries } = await storefrontFixture();
	const result = await entries.product("abc234");
	expect(result).toEqual({
		code: "ABC234",
		name: "Produto",
		imageUrl: "https://example.com/image.jpg",
		imageUrls: ["https://example.com/image.jpg"],
		destinationUrl: "https://example.com",
		marketplace: "shein",
		colors: [{ id: "red", name: "Vermelho" }],
		sizes: [],
	});
});
test("public outfit excludes inactive and deleted products", async () => {
	const { entries } = await storefrontFixture();
	const result = await entries.outfit("out-aaaaaaaaaaaaaaaa");
	expect(result.products.map((p) => p.code)).toEqual(["ABC234"]);
	expect(result.name).toBe("Look");
});
test("unknown and inactive entries reject without revealing purchase destinations", async () => {
	const { entries } = await storefrontFixture();
	for (const code of ["ZZZZ", "YYYY", "../products"])
		expect(entries.product(code)).rejects.toMatchObject({
			code: "PRODUCT_NOT_FOUND",
		});
	for (const code of ["OUT-BBBBBBBBBBBBBBBB", "bad"])
		expect(entries.outfit(code)).rejects.toMatchObject({
			code: "OUTFIT_NOT_FOUND",
		});
});
