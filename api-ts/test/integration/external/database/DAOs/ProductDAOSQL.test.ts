import { beforeEach, describe, expect, it } from "bun:test";
import { DatabaseConnectionFake } from "@test/support/fakes/DatabaseConnectionFake";
import { productRow as row } from "@test/support/fixtures/productRow";
import { ProductCodeAlreadyExistsError } from "@/application/errors/ProductCodeAlreadyExistsError";
import { ProductDAOSQL } from "@/external/database/DAOs/ProductDAOSQL";

describe("Product SQL DAO", () => {
	let connection: DatabaseConnectionFake;
	let dao: ProductDAOSQL;
	beforeEach(() => {
		connection = new DatabaseConnectionFake();
		dao = new ProductDAOSQL(connection);
	});
	it("should bind insert values and populate timestamps", async () => {
		await dao.save(row);
		const query = connection.lastQuery();
		expect(query.sql).toContain("INSERT INTO products");
		expect(query.sql).toContain("created_at, updated_at");
		expect(query.sql).toContain("$8::text::jsonb");
		expect(query.sql).toContain("CURRENT_TIMESTAMP");
		expect(query.params).toEqual([
			row.id,
			row.code,
			row.destinationUrl,
			row.marketplace,
			row.imageUrl,
			row.status,
			row.name,
			JSON.stringify([row.imageUrl]),
		]);
		for (const value of query.params.filter((v) => typeof v === "string"))
			expect(query.sql).not.toContain(value as string);
	});
	it("should update fields and timestamp using the persisted id", async () => {
		await dao.update(row);
		const query = connection.lastQuery();
		expect(query.sql).toContain("UPDATE products SET");
		expect(query.sql).toContain("updated_at = CURRENT_TIMESTAMP");
		expect(query.sql).toContain("WHERE id = $7");
		expect(query.sql).toContain("image_urls = $8::text::jsonb");
		expect(query.params).toEqual([
			row.code,
			row.destinationUrl,
			row.marketplace,
			row.imageUrl,
			row.status,
			row.name,
			row.id,
			JSON.stringify([row.imageUrl]),
		]);
	});
	it("should bind the id on deletion", async () => {
		await dao.remove({ id: "id' OR 1=1 --" });
		expect(connection.queries[0]).toEqual({
			sql: "DELETE FROM products WHERE id = $1",
			params: ["id' OR 1=1 --"],
		});
	});
	it("should find by id using bound parameters and camelCase aliases", async () => {
		connection.rows = [row];
		expect(await dao.findById({ id: "lookup" })).toEqual(row);
		const query = connection.lastQuery();
		expect(query.params).toEqual(["lookup"]);
		expect(query.sql).toContain("WHERE id = $1");
		expect(query.sql).toContain('created_at AS "createdAt"');
		expect(query.sql).toContain('destination_url AS "destinationUrl"');
		expect(query.sql).toContain('image_url AS "imageUrl"');
	});
	it("should return undefined when id is missing", async () => {
		expect(await dao.findById({ id: "missing" })).toEqual(undefined);
	});
	it("should find by code using bound parameters and camelCase aliases", async () => {
		connection.rows = [row];
		expect(await dao.findByCode({ code: "lookup" })).toEqual(row);
		const query = connection.lastQuery();
		expect(query.params).toEqual(["lookup"]);
		expect(query.sql).toContain("WHERE code = $1");
		expect(query.sql).toContain('created_at AS "createdAt"');
		expect(query.sql).toContain('destination_url AS "destinationUrl"');
		expect(query.sql).toContain('image_url AS "imageUrl"');
	});
	it("should return undefined when code is missing", async () => {
		expect(await dao.findByCode({ code: "missing" })).toEqual(undefined);
	});
	it("should find by marketplace using bound parameters and camelCase aliases", async () => {
		connection.rows = [row];
		expect(await dao.findByMarketplace({ marketplace: "lookup" })).toEqual([
			row,
		]);
		const query = connection.lastQuery();
		expect(query.params).toEqual(["lookup"]);
		expect(query.sql).toContain("WHERE marketplace = $1");
		expect(query.sql).toContain('created_at AS "createdAt"');
		expect(query.sql).toContain('destination_url AS "destinationUrl"');
		expect(query.sql).toContain('image_url AS "imageUrl"');
	});
	it("should return an empty list when marketplace is missing", async () => {
		expect(await dao.findByMarketplace({ marketplace: "missing" })).toEqual([]);
	});
	it("should find by destinationUrl using bound parameters and camelCase aliases", async () => {
		connection.rows = [row];
		expect(
			await dao.findByDestinationUrl({ destinationUrl: "lookup" }),
		).toEqual([row]);
		const query = connection.lastQuery();
		expect(query.params).toEqual(["lookup"]);
		expect(query.sql).toContain("WHERE destination_url = $1");
		expect(query.sql).toContain('created_at AS "createdAt"');
		expect(query.sql).toContain('destination_url AS "destinationUrl"');
		expect(query.sql).toContain('image_url AS "imageUrl"');
	});
	it("should return an empty list when destinationUrl is missing", async () => {
		expect(
			await dao.findByDestinationUrl({ destinationUrl: "missing" }),
		).toEqual([]);
	});
	it.each(["save", "update", "remove", "findById"] as const)(
		"should propagate errors from %s",
		async (method) => {
			const error = new Error("connection failed");
			connection.error = error;
			const call =
				method === "save" || method === "update"
					? dao[method](row)
					: dao[method]({ id: row.id });
			return expect(call).rejects.toBe(error);
		},
	);
	it.each(["save", "update"] as const)(
		"should translate product code uniqueness errors on %s",
		async (method) => {
			connection.error = { code: "23505", constraint: "products_code_unique" };
			return expect(dao[method](row)).rejects.toBeInstanceOf(
				ProductCodeAlreadyExistsError,
			);
		},
	);
	it("should preserve unrelated uniqueness errors", async () => {
		const error = { code: "23505", constraint: "products_pkey" };
		connection.error = error;
		return expect(dao.save(row)).rejects.toBe(error);
	});
});

describe("Product SQL DAO Bun SQLSTATE", () => {
	it("maps Bun errno 23505 to the code collision used by creation retries", () => {
		const connection = new DatabaseConnectionFake();
		connection.error = {
			code: "ERR_POSTGRES_SERVER_ERROR",
			errno: "23505",
			constraint: "products_code_unique",
		};
		expect(new ProductDAOSQL(connection).save(row)).rejects.toBeInstanceOf(
			ProductCodeAlreadyExistsError,
		);
	});
});

describe.skipIf(!process.env.POSTGRES_GALLERY_TEST_URL)(
	"Product gallery with real Bun/Postgres binding",
	() => {
		it("persists JSON arrays on insert and update rather than double-encoded JSON strings", async () => {
			const { BunSQLAdapter } = await import(
				"@/external/database/BunSQLAdapter"
			);
			const dbUrl = process.env.POSTGRES_GALLERY_TEST_URL;
			if (!dbUrl) throw new Error("Missing explicit PostgreSQL test URL");
			const db = new BunSQLAdapter({ dbUrl });
			const tx = await db.transaction();
			try {
				// This temporary table shadows products only on this reserved connection.
				// Rollback removes all test data without touching the application's tables.
				await tx.query(`CREATE TEMP TABLE products (
        id varchar PRIMARY KEY, code varchar(6), name varchar,
        destination_url varchar, marketplace varchar, image_url varchar,
        status varchar, image_urls jsonb NOT NULL,
        created_at timestamptz, updated_at timestamptz,
        CHECK (jsonb_typeof(image_urls)='array' AND jsonb_array_length(image_urls) BETWEEN 1 AND 20 AND image_urls->>0=image_url)
      ) ON COMMIT DROP`);
				const dao = new ProductDAOSQL({
					query: tx.query.bind(tx),
					transaction: async () => {
						throw new Error("Unexpected nested transaction");
					},
					close: async () => {},
				});
				const imageUrls: [string, string] = [
					"https://example.com/cover.jpg",
					"https://example.com/back.jpg",
				];
				await dao.save({ ...row, imageUrl: imageUrls[0], imageUrls });
				const [inserted] = await tx.query<{ image_urls: string[] }>(
					"SELECT image_urls FROM pg_temp.products WHERE id=$1",
					[row.id],
				);
				expect(inserted?.image_urls).toEqual(imageUrls);
				const updated: [string, string] = [imageUrls[1], imageUrls[0]];
				await dao.update({ ...row, imageUrl: updated[0], imageUrls: updated });
				const [saved] = await tx.query<{
					image_url: string;
					image_urls: string[];
				}>("SELECT image_url,image_urls FROM pg_temp.products WHERE id=$1", [
					row.id,
				]);
				expect(saved?.image_urls).toEqual(updated);
				expect(saved?.image_url).toBe(updated[0]);
			} finally {
				await tx.rollback();
				await db.close();
			}
		});
	},
);
