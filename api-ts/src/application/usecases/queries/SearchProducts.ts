import { BadRequestError } from "@/application/errors/BadRequestError";
import type { ProductDAO } from "@/infra/database/DAOs/ProductDAO";

export type SearchProductsInput = {
	limit?: number;
	offset?: number;
	productCode?: string;
	outfitCode?: string;
	name?: string;
	marketplace?: string;
	size?: string[];
	color?: string[];
};
export class SearchProducts {
	constructor(private readonly products: ProductDAO) {}
	async execute(input: SearchProductsInput) {
		const limit = input.limit ?? 25,
			offset = input.offset ?? 0;
		if (
			!Number.isInteger(limit) ||
			limit < 1 ||
			limit > 100 ||
			!Number.isSafeInteger(offset) ||
			offset < 0
		)
			throw new BadRequestError("Invalid pagination");
		const productCode = this.text(input.productCode, 6)?.toUpperCase();
		const outfitCode = this.text(input.outfitCode, 20)?.toUpperCase();
		const name = this.text(input.name, 160);
		const marketplace = this.text(input.marketplace, 20)?.toLowerCase();
		if (productCode !== undefined && !/^[A-HJ-NP-Z2-9]{4,6}$/.test(productCode))
			throw new BadRequestError("Invalid product code");
		if (outfitCode !== undefined && !/^OUT-[A-F0-9]{16}$/.test(outfitCode))
			throw new BadRequestError("Invalid outfit code");
		if (marketplace !== undefined && !["shopee", "shein"].includes(marketplace))
			throw new BadRequestError("Invalid marketplace");
		const sizeIds = this.choices(input.size),
			colorIds = this.choices(input.color);
		const rows = await this.products.list({
			limit: limit + 1,
			offset,
			activeOnly: true,
			productCode,
			outfitCode,
			name,
			marketplace,
			sizeIds,
			colorIds,
		});
		return {
			items: rows
				.slice(0, limit)
				.map(({ code, name, imageUrl, marketplace }) => ({
					code,
					name,
					imageUrl,
					marketplace,
				})),
			limit,
			offset,
			hasMore: rows.length > limit,
		};
	}
	private text(value: unknown, max: number): string | undefined {
		if (value === undefined) return undefined;
		if (typeof value !== "string" || !value.trim() || value.trim().length > max)
			throw new BadRequestError("Invalid search text");
		return value.trim();
	}
	private choices(value: unknown): string[] | undefined {
		if (value === undefined) return undefined;
		if (
			!Array.isArray(value) ||
			!value.length ||
			value.length > 100 ||
			value.some(
				(id) =>
					typeof id !== "string" ||
					!/^[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}$/i.test(
						id,
					),
			)
		)
			throw new BadRequestError("Invalid search choices");
		return [...new Set(value.map((id) => id.toLowerCase()))];
	}
}
