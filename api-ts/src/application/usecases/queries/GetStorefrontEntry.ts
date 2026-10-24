import type {
	CatalogRepository,
	FilterCategory,
} from "@/application/CatalogRepository";
import { BadRequestError } from "@/application/errors/BadRequestError";
import { OutfitNotFoundError } from "@/application/errors/OutfitNotFoundError";
import { ProductNotFoundError } from "@/application/errors/ProductNotFoundError";
import { ProductCode } from "@/domain/entities/ProductCode";
import type { ProductDAO, ProductDTO } from "@/infra/database/DAOs/ProductDAO";

/** Public projections only: no admin session, internal IDs, or timestamps. */
export class GetStorefrontEntry {
	constructor(
		private readonly products: ProductDAO,
		private readonly catalog: CatalogRepository,
	) {}

	private async project(product: ProductDTO, categories: FilterCategory[]) {
		const ids = new Set(await this.catalog.getProductOptions(product.code));
		const options = (category: string) =>
			(categories.find((c) => c.id === category)?.options ?? [])
				.filter((option) => ids.has(option.id))
				.map(({ id, name }) => ({ id, name }));
		return {
			code: product.code,
			name: product.name,
			imageUrl: product.imageUrl,
			imageUrls: product.imageUrls ?? [product.imageUrl],
			marketplace: product.marketplace,
			destinationUrl: product.destinationUrl,
			colors: options("color"),
			sizes: options("size"),
		};
	}

	async product(input: string) {
		let code: string;
		try {
			code = new ProductCode(input, true).getValue();
		} catch {
			throw new ProductNotFoundError(input);
		}
		const product = await this.products.findByCode({ code });
		if (product?.status !== "active") throw new ProductNotFoundError(code);
		return this.project(product, await this.catalog.listCategories());
	}

	async outfit(input: string) {
		const code = input.trim().toUpperCase();
		if (!/^OUT-[A-F0-9]{16}$/.test(code)) throw new OutfitNotFoundError(code);
		const outfit = await this.catalog.getOutfit(code).catch((error) => {
			if (error instanceof BadRequestError) throw new OutfitNotFoundError(code);
			throw error;
		});
		const categories = await this.catalog.listCategories();
		const products = await Promise.all(
			outfit.productCodes.map(async (code) => {
				const product = await this.products.findByCode({ code });
				return product?.status === "active"
					? this.project(product, categories)
					: null;
			}),
		);
		return {
			code: outfit.code,
			name: outfit.name,
			products: products.filter((p) => p !== null),
		};
	}
}
