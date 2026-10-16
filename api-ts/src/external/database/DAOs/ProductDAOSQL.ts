import { ProductCodeAlreadyExistsError } from "@/application/errors/ProductCodeAlreadyExistsError";
import type {
	InputProductDTO,
	ProductDAO,
	ProductDTO,
} from "@/infra/database/DAOs/ProductDAO";
import type { DatabaseConnection } from "@/infra/database/DatabaseConnection";
export class ProductDAOSQL implements ProductDAO {
	constructor(private readonly connection: DatabaseConnection) {}
	async list(limit: number, offset: number): Promise<ProductDTO[]> {
		return this.connection.query<ProductDTO>(
			'SELECT id, code, name, destination_url AS "destinationUrl", marketplace, image_url AS "imageUrl", status, created_at AS "createdAt", updated_at AS "updatedAt" FROM products ORDER BY created_at DESC, id DESC LIMIT $1 OFFSET $2',
			[limit, offset],
		);
	}
	async save(entity: InputProductDTO): Promise<void> {
		try {
			await this.connection.query(
				"INSERT INTO products (id, code, destination_url, marketplace, image_url, status, name, created_at, updated_at) VALUES ($1, $2, $3, $4, $5, $6, $7, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)",
				[
					entity.id,
					entity.code,
					entity.destinationUrl,
					entity.marketplace,
					entity.imageUrl,
					entity.status,
					entity.name,
				],
			);
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
	async update(entity: InputProductDTO): Promise<void> {
		try {
			await this.connection.query(
				"UPDATE products SET code = $1, destination_url = $2, marketplace = $3, image_url = $4, status = $5, name = $6, updated_at = CURRENT_TIMESTAMP WHERE id = $7",
				[
					entity.code,
					entity.destinationUrl,
					entity.marketplace,
					entity.imageUrl,
					entity.status,
					entity.name,
					entity.id,
				],
			);
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
	async remove(id: string): Promise<void> {
		await this.connection.query("DELETE FROM products WHERE id = $1", [id]);
	}
	async findById(value: string): Promise<ProductDTO | undefined> {
		const rows = await this.connection.query<ProductDTO>(
			'SELECT id, code, name, destination_url AS "destinationUrl", marketplace, image_url AS "imageUrl", status, created_at AS "createdAt", updated_at AS "updatedAt" FROM products WHERE id = $1',
			[value],
		);
		return rows[0] ?? undefined;
	}
	async findByCode(value: string): Promise<ProductDTO | undefined> {
		const rows = await this.connection.query<ProductDTO>(
			'SELECT id, code, name, destination_url AS "destinationUrl", marketplace, image_url AS "imageUrl", status, created_at AS "createdAt", updated_at AS "updatedAt" FROM products WHERE code = $1',
			[value],
		);
		return rows[0] ?? undefined;
	}
	async findByMarketplace(value: string): Promise<ProductDTO[]> {
		const rows = await this.connection.query<ProductDTO>(
			'SELECT id, code, name, destination_url AS "destinationUrl", marketplace, image_url AS "imageUrl", status, created_at AS "createdAt", updated_at AS "updatedAt" FROM products WHERE marketplace = $1',
			[value],
		);
		return rows;
	}
	async findByDestinationUrl(value: string): Promise<ProductDTO[]> {
		const rows = await this.connection.query<ProductDTO>(
			'SELECT id, code, name, destination_url AS "destinationUrl", marketplace, image_url AS "imageUrl", status, created_at AS "createdAt", updated_at AS "updatedAt" FROM products WHERE destination_url = $1',
			[value],
		);
		return rows;
	}
}
