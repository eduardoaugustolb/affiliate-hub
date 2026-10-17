import { describe, expect, it, spyOn } from "bun:test";
import { ProductDAOFake } from "@test/support/fakes/ProductDAOFake";
import { productFake } from "@test/support/fixtures/productFake";
import { ProductNotFoundError } from "@/application/errors/ProductNotFoundError";
import { ProductUnavailableError } from "@/application/errors/ProductUnavailableError";
import { ResolveProduct } from "@/application/usecases/queries/ResolveProduct";

describe("ResolveProduct", () => {
	async function setup(status = "active") {
		const repo = new ProductDAOFake();
		await repo.save({ ...productFake, status });
		return { repo, query: new ResolveProduct(repo) };
	}
	it.each(["ABC234", "abc234", " AbC234 "])(
		"resolves equivalent codes: %s",
		async (code) => {
			const { query } = await setup();
			expect(await query.execute(undefined, { code })).toEqual({
				destinationUrl: productFake.destinationUrl,
			});
		},
	);
	it.each(["", "abc", "https://example.com", "O0I1", "TOOLONG"])(
		"rejects invalid input without querying: %s",
		async (code) => {
			const { repo, query } = await setup();
			const find = spyOn(repo, "findByCode");
			expect(query.execute(undefined, { code })).rejects.toBeInstanceOf(
				ProductNotFoundError,
			);
			expect(find).not.toHaveBeenCalled();
		},
	);
	it("rejects missing products", async () => {
		const { query } = await setup();
		expect(query.execute(undefined, { code: "ZZZZ" })).rejects.toBeInstanceOf(
			ProductNotFoundError,
		);
	});
	it("does not resolve inactive products", async () => {
		const { query } = await setup("inactive");
		expect(
			query.execute(undefined, { code: productFake.code }),
		).rejects.toBeInstanceOf(ProductUnavailableError);
	});
});
