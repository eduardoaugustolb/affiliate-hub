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
		expect(query.sql).toContain("CURRENT_TIMESTAMP");
		expect(query.params).toEqual([
			row.id,
			row.code,
			row.destinationUrl,
			row.marketplace,
			row.imageUrl,
			row.status,
			row.name,
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
		expect(query.params).toEqual([
			row.code,
			row.destinationUrl,
			row.marketplace,
			row.imageUrl,
			row.status,
			row.name,
			row.id,
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
