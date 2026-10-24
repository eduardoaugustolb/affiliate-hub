import { BadRequestError } from "@/application/errors/BadRequestError";
import { ProductCodeAlreadyExistsError } from "@/application/errors/ProductCodeAlreadyExistsError";
import type {
	InputProductDTO,
	ListProductsDTO,
	ProductDAO,
	ProductDTO,
} from "@/infra/database/DAOs/ProductDAO";
import type { DatabaseConnection } from "@/infra/database/DatabaseConnection";
export class ProductDAOSQL implements ProductDAO {
	constructor(private readonly connection: DatabaseConnection) {}
	async list({
		limit,
		offset,
		outfitCode,
		activeOnly,
		productCode,
		name,
		marketplace,
		sizeIds,
		colorIds,
	}: ListProductsDTO): Promise<ProductDTO[]> {
		const params: unknown[] = [limit, offset];
		const conditions: string[] = [];
		if (activeOnly) conditions.push("p.status = 'active'");
		for (const [column, value] of [
			["code", productCode],
			["marketplace", marketplace],
		] as const) {
			if (value !== undefined) {
				params.push(value);
				conditions.push(`p.${column} = $${params.length}`);
			}
		}
		if (name !== undefined) {
			params.push(name);
			// Literal substring: percent and underscore are not wildcard operators.
			conditions.push(
				`strpos(lower(p.name), lower($${params.length}::text)) > 0`,
			);
		}
		for (const [category, ids] of [
			["size", sizeIds],
			["color", colorIds],
		] as const) {
			if (!ids?.length) continue;
			params.push(JSON.stringify(ids));
			const arg = `$${params.length}`;
			// All selected identifiers must belong to the requested fixed category.
			conditions.push(
				`(SELECT COUNT(*) FROM filter_options f WHERE f.category_id = '${category}' AND f.id = ANY(ARRAY(SELECT jsonb_array_elements_text(${arg}::text::jsonb))::uuid[])) = cardinality(ARRAY(SELECT jsonb_array_elements_text(${arg}::text::jsonb))::uuid[])`,
			);
			conditions.push(
				`EXISTS (SELECT 1 FROM product_filter_options pf JOIN filter_options f ON f.id = pf.option_id WHERE pf.product_id = p.id AND f.category_id = '${category}' AND f.id = ANY(ARRAY(SELECT jsonb_array_elements_text(${arg}::text::jsonb))::uuid[]))`,
			);
		}
		if (outfitCode !== undefined) {
			params.push(outfitCode);
			conditions.push(
				`EXISTS (SELECT 1 FROM outfit_products op WHERE op.product_id = p.id AND op.outfit_code = $${params.length})`,
			);
		}
		return this.connection.query<ProductDTO>(
			`SELECT p.id, p.code, p.name, p.destination_url AS "destinationUrl", p.marketplace, p.image_url AS "imageUrl", p.image_urls AS "imageUrls", p.status, p.created_at AS "createdAt", p.updated_at AS "updatedAt" FROM products p ${conditions.length ? `WHERE ${conditions.join(" AND ")}` : ""} ORDER BY p.created_at DESC, p.id DESC LIMIT $1 OFFSET $2`,
			params,
		);
	}
	private async withOptions(
		entity: InputProductDTO,
		optionIds: string[] | undefined,
		write: (connection: Pick<DatabaseConnection, "query">) => Promise<void>,
	) {
		if (optionIds === undefined) return write(this.connection);
		const tx = await this.connection.transaction();
		try {
			await write(tx);
			await tx.query(
				"DELETE FROM product_filter_options WHERE product_id = $1",
				[entity.id],
			);
			await tx.query(
				"INSERT INTO product_filter_options (product_id, option_id) SELECT $1::varchar, unnest(ARRAY(SELECT jsonb_array_elements_text($2::text::jsonb))::uuid[])",
				[entity.id, JSON.stringify(optionIds)],
			);
			await tx.commit();
		} catch (error) {
			await tx.rollback();
			const state =
				error && typeof error === "object"
					? "errno" in error
						? error.errno
						: "code" in error
							? error.code
							: undefined
					: undefined;
			if (["23503", "22P02"].includes(String(state)))
				throw new BadRequestError("Unknown product filter option");
			throw error;
		}
	}
	async save(entity: InputProductDTO, optionIds?: string[]): Promise<void> {
		try {
			await this.withOptions(entity, optionIds, async (connection) => {
				await connection.query(
					"INSERT INTO products (id, code, destination_url, marketplace, image_url, status, name, image_urls, created_at, updated_at) VALUES ($1, $2, $3, $4, $5, $6, $7, $8::text::jsonb, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)",
					[
						entity.id,
						entity.code,
						entity.destinationUrl,
						entity.marketplace,
						entity.imageUrl,
						entity.status,
						entity.name,
						JSON.stringify(entity.imageUrls ?? [entity.imageUrl]),
					],
				);
			});
		} catch (error) {
			if (
				typeof error === "object" &&
				error !== null &&
				(("code" in error && error.code === "23505") ||
					("errno" in error && error.errno === "23505")) &&
				"constraint" in error &&
				error.constraint === "products_code_unique"
			)
				throw new ProductCodeAlreadyExistsError();
			throw error;
		}
	}
	async update(entity: InputProductDTO, optionIds?: string[]): Promise<void> {
		try {
			await this.withOptions(entity, optionIds, async (connection) => {
				await connection.query(
					"UPDATE products SET code = $1, destination_url = $2, marketplace = $3, image_url = $4, status = $5, name = $6, image_urls = $8::text::jsonb, updated_at = CURRENT_TIMESTAMP WHERE id = $7",
					[
						entity.code,
						entity.destinationUrl,
						entity.marketplace,
						entity.imageUrl,
						entity.status,
						entity.name,
						entity.id,
						JSON.stringify(entity.imageUrls ?? [entity.imageUrl]),
					],
				);
			});
		} catch (error) {
			if (
				typeof error === "object" &&
				error !== null &&
				(("code" in error && error.code === "23505") ||
					("errno" in error && error.errno === "23505")) &&
				"constraint" in error &&
				error.constraint === "products_code_unique"
			)
				throw new ProductCodeAlreadyExistsError();
			throw error;
		}
	}
	async remove({ id }: Pick<ProductDTO, "id">): Promise<void> {
		await this.connection.query("DELETE FROM products WHERE id = $1", [id]);
	}
	async findById({
		id: value,
	}: Pick<ProductDTO, "id">): Promise<ProductDTO | undefined> {
		const rows = await this.connection.query<ProductDTO>(
			'SELECT id, code, name, destination_url AS "destinationUrl", marketplace, image_url AS "imageUrl", image_urls AS "imageUrls", status, created_at AS "createdAt", updated_at AS "updatedAt" FROM products WHERE id = $1',
			[value],
		);
		return rows[0] ?? undefined;
	}
	async findByCode({
		code: value,
	}: Pick<ProductDTO, "code">): Promise<ProductDTO | undefined> {
		const rows = await this.connection.query<ProductDTO>(
			'SELECT id, code, name, destination_url AS "destinationUrl", marketplace, image_url AS "imageUrl", image_urls AS "imageUrls", status, created_at AS "createdAt", updated_at AS "updatedAt" FROM products WHERE code = $1',
			[value],
		);
		return rows[0] ?? undefined;
	}
	async findByMarketplace({
		marketplace: value,
	}: Pick<ProductDTO, "marketplace">): Promise<ProductDTO[]> {
		const rows = await this.connection.query<ProductDTO>(
			'SELECT id, code, name, destination_url AS "destinationUrl", marketplace, image_url AS "imageUrl", image_urls AS "imageUrls", status, created_at AS "createdAt", updated_at AS "updatedAt" FROM products WHERE marketplace = $1',
			[value],
		);
		return rows;
	}
	async findByDestinationUrl({
		destinationUrl: value,
	}: Pick<ProductDTO, "destinationUrl">): Promise<ProductDTO[]> {
		const rows = await this.connection.query<ProductDTO>(
			'SELECT id, code, name, destination_url AS "destinationUrl", marketplace, image_url AS "imageUrl", image_urls AS "imageUrls", status, created_at AS "createdAt", updated_at AS "updatedAt" FROM products WHERE destination_url = $1',
			[value],
		);
		return rows;
	}
}
