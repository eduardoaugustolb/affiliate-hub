import { describe, expect, it, spyOn } from "bun:test";
import { ProductDAOFake } from "@test/support/fakes/ProductDAOFake";
import { productRow } from "@test/support/fixtures/productRow";
import { BadRequestError } from "@/application/errors/BadRequestError";
import {
	SearchProducts,
	type SearchProductsInput,
} from "@/application/usecases/queries/SearchProducts";

describe("SearchProducts", () => {
	it("normalizes and combines all fixed filters, always requesting active products", async () => {
		const dao = new ProductDAOFake(),
			list = spyOn(dao, "list").mockResolvedValue([]),
			id = crypto.randomUUID();
		const result = await new SearchProducts(dao).execute({
			productCode: " abcd ",
			outfitCode: " out-aaaaaaaaaaaaaaaa ",
			name: " Camiseta ",
			marketplace: " SHEIN ",
			size: [id.toUpperCase(), id],
			color: [id],
			limit: 10,
			offset: 5,
		});
		expect(list).toHaveBeenCalledWith({
			limit: 11,
			offset: 5,
			activeOnly: true,
			productCode: "ABCD",
			outfitCode: "OUT-AAAAAAAAAAAAAAAA",
			name: "Camiseta",
			marketplace: "shein",
			sizeIds: [id],
			colorIds: [id],
		});
		expect(result).toEqual({ items: [], limit: 10, offset: 5, hasMore: false });
	});
	it("returns a bounded public projection and accurate hasMore", async () => {
		const dao = new ProductDAOFake();
		spyOn(dao, "list").mockResolvedValue([
			productRow,
			{ ...productRow, code: "EFGH" },
		]);
		const result = await new SearchProducts(dao).execute({ limit: 1 });
		expect(result).toEqual({
			items: [
				{
					code: productRow.code,
					name: productRow.name,
					imageUrl: productRow.imageUrl,
					marketplace: productRow.marketplace,
				},
			],
			limit: 1,
			offset: 0,
			hasMore: true,
		});
	});
	const invalid: SearchProductsInput[] = [
		{ limit: 0 },
		{ limit: 101 },
		{ limit: 1.5 },
		{ offset: -1 },
		{ offset: NaN },
		{ offset: Number.MAX_SAFE_INTEGER + 1 },
		{ productCode: "AB" },
		{ productCode: "AAAAAA'" },
		{ outfitCode: "invalid" },
		{ name: " " },
		{ name: "a".repeat(161) },
		{ marketplace: "other" },
		{ size: [] },
		{ color: ["unknown"] },
		{ size: Array(101).fill(crypto.randomUUID()) },
	];
	it.each(invalid)(
		"rejects malformed search %j before accessing products",
		async (input) => {
			const dao = new ProductDAOFake(),
				list = spyOn(dao, "list");
			expect(new SearchProducts(dao).execute(input)).rejects.toBeInstanceOf(
				BadRequestError,
			);
			expect(list).not.toHaveBeenCalled();
		},
	);
	it("uses defaults without requiring an actor", async () => {
		const dao = new ProductDAOFake();
		spyOn(dao, "list").mockResolvedValue([]);
		expect(await new SearchProducts(dao).execute({})).toMatchObject({
			limit: 25,
			offset: 0,
			items: [],
			hasMore: false,
		});
	});
});
