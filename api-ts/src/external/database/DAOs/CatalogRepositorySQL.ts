import type {
	CatalogRepository,
	FilterCategory,
	Outfit,
} from "@/application/CatalogRepository";
import { BadRequestError } from "@/application/errors/BadRequestError";
import type {
	DatabaseConnection,
	DatabaseTransaction,
} from "@/infra/database/DatabaseConnection";
export class CatalogRepositorySQL implements CatalogRepository {
	constructor(private readonly db: DatabaseConnection) {}
	async listCategories(): Promise<FilterCategory[]> {
		return this.db.query<FilterCategory>(
			`SELECT c.id, c.name, COALESCE(json_agg(json_build_object('id', o.id, 'name', o.name) ORDER BY o.name) FILTER (WHERE o.id IS NOT NULL), '[]') AS options FROM filter_categories c LEFT JOIN filter_options o ON o.category_id = c.id GROUP BY c.id ORDER BY c.name`,
		);
	}
	private async mutate<T>(operation: () => Promise<T>): Promise<T> {
		try {
			return await operation();
		} catch (error) {
			const code =
				typeof error === "object" && error !== null && "code" in error
					? "errno" in error
						? error.errno
						: error.code
					: undefined;
			if (["23505", "23503", "22P02"].includes(String(code)))
				throw new BadRequestError(
					"Duplicate name or unknown catalog reference",
				);
			throw error;
		}
	}
	private async transaction<T>(
		operation: (tx: DatabaseTransaction) => Promise<T>,
	): Promise<T> {
		return this.mutate(async () => {
			const tx = await this.db.transaction();
			try {
				const result = await operation(tx);
				await tx.commit();
				return result;
			} catch (e) {
				await tx.rollback();
				throw e;
			}
		});
	}
	async createOption(categoryId: string, name: string) {
		const option = { id: crypto.randomUUID(), name };
		await this.mutate(() =>
			this.db.query(
				"INSERT INTO filter_options (id, category_id, name) VALUES ($1, $2, $3)",
				[option.id, categoryId, name],
			),
		);
		return option;
	}
	async removeOption(id: string) {
		await this.mutate(() =>
			this.db.query("DELETE FROM filter_options WHERE id = $1", [id]),
		);
	}
	async getProductOptions(code: string): Promise<string[]> {
		const rows = await this.db.query<{ optionIds: string[] }>(
			`SELECT COALESCE(json_agg(pf.option_id) FILTER (WHERE pf.option_id IS NOT NULL), '[]') AS "optionIds" FROM products p LEFT JOIN product_filter_options pf ON pf.product_id = p.id WHERE p.code = $1 GROUP BY p.id`,
			[code],
		);
		if (!rows[0]) throw new BadRequestError("Unknown product code");
		return rows[0].optionIds;
	}
	async setProductOptions(code: string, optionIds: string[]) {
		await this.transaction(async (tx) => {
			const products = await tx.query<{ id: string }>(
				"SELECT id FROM products WHERE code = $1 FOR UPDATE",
				[code],
			);
			const product = products[0];
			if (!product) throw new BadRequestError("Unknown product code");
			// Validate before replacing; foreign keys protect concurrent deletions.
			const options = await tx.query(
				"SELECT id FROM filter_options WHERE id = ANY(ARRAY(SELECT jsonb_array_elements_text($1::text::jsonb))::uuid[])",
				[JSON.stringify(optionIds)],
			);
			if (options.length !== optionIds.length)
				throw new BadRequestError("Unknown filter option");
			await tx.query(
				"DELETE FROM product_filter_options WHERE product_id = $1",
				[product.id],
			);
			await tx.query(
				"INSERT INTO product_filter_options (product_id, option_id) SELECT $1::varchar, unnest(ARRAY(SELECT jsonb_array_elements_text($2::text::jsonb))::uuid[])",
				[product.id, JSON.stringify(optionIds)],
			);
		});
	}
	async createOutfit(name: string, productCodes: string[]): Promise<Outfit> {
		// Independent namespace, a random code; ON CONFLICT allows safe retries.
		return this.transaction(async (tx) => {
			const products = await tx.query<{ id: string }>(
				"SELECT id FROM products WHERE code = ANY(ARRAY(SELECT jsonb_array_elements_text($1::text::jsonb))) FOR KEY SHARE",
				[JSON.stringify(productCodes)],
			);
			if (products.length !== productCodes.length)
				throw new BadRequestError("Unknown product code");
			for (let attempt = 0; attempt < 5; attempt++) {
				const code =
					"OUT-" +
					crypto.randomUUID().replaceAll("-", "").slice(0, 16).toUpperCase();
				const inserted = await tx.query(
					"INSERT INTO outfits (code, name) VALUES ($1, $2) ON CONFLICT DO NOTHING RETURNING code",
					[code, name],
				);
				if (!inserted.length) continue;
				await tx.query(
					"INSERT INTO outfit_products (outfit_code, product_id) SELECT $1, unnest(ARRAY(SELECT jsonb_array_elements_text($2::text::jsonb))::varchar[])",
					[code, JSON.stringify(products.map((p) => p.id))],
				);
				return { code, name, productCodes };
			}
			throw new Error("Unable to allocate outfit code");
		});
	}
	async getOutfit(code: string): Promise<Outfit> {
		const rows = await this.db.query<Outfit>(
			`SELECT o.code, o.name, COALESCE(json_agg(p.code ORDER BY p.code) FILTER (WHERE p.id IS NOT NULL), '[]') AS "productCodes" FROM outfits o LEFT JOIN outfit_products op ON op.outfit_code = o.code LEFT JOIN products p ON p.id = op.product_id WHERE o.code = $1 GROUP BY o.code`,
			[code],
		);
		if (!rows[0]) throw new BadRequestError("Unknown outfit code");
		return rows[0];
	}
	async removeOutfit(code: string) {
		await this.db.query("DELETE FROM outfits WHERE code = $1", [code]);
	}
}
