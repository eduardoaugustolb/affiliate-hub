import { mock } from "bun:test";
import { ProductDAOFake } from "@test/support/fakes/ProductDAOFake";
import { productFake } from "@test/support/fixtures/productFake";
import type { CatalogRepository } from "@/application/CatalogRepository";
import { BadRequestError } from "@/application/errors/BadRequestError";
import { GetStorefrontEntry } from "@/application/usecases/queries/GetStorefrontEntry";
export async function storefrontFixture() {
	const products = new ProductDAOFake();
	await products.save(productFake);
	await products.save({
		...productFake,
		id: "inactive",
		code: "ZZZZ",
		status: "inactive",
	});
	const catalog: CatalogRepository = {
		listCategories: mock(async () => [
			{
				id: "color" as const,
				name: "Cor",
				options: [
					{ id: "red", name: "Vermelho" },
					{ id: "blue", name: "Azul" },
				],
			},
		]),
		getProductOptions: mock(async () => ["red"]),
		getOutfit: mock(async (code) => {
			if (code !== "OUT-AAAAAAAAAAAAAAAA")
				throw new BadRequestError("Unknown outfit code");
			return {
				code,
				name: "Look",
				productCodes: [productFake.code, "ZZZZ", "YYYY"],
			};
		}),
		createOption: mock(async () => ({ id: "red", name: "Vermelho" })),
		removeOption: mock(async () => {}),
		setProductOptions: mock(async () => {}),
		createOutfit: mock(async (name, productCodes) => ({
			code: "OUT-AAAAAAAAAAAAAAAA",
			name,
			productCodes,
		})),
		removeOutfit: mock(async () => {}),
	};
	return {
		products,
		catalog,
		entries: new GetStorefrontEntry(products, catalog),
	};
}
