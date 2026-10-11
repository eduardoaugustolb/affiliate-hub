import { beforeEach, describe, expect, it } from "bun:test";
import { UserAlreadyExistsError } from "@/application/errors/UserAlreadyExistsError";
import { UserDAOSQL } from "@/external/database/DAOs/UserDAOSQL";
import { DatabaseConnectionFake } from "../../mocks/DatabaseConnectionFake";

const dateProvider = { now: () => new Date("2026-10-04T12:00:00Z") };
const row = {
	id: "persisted-id",
	name: "Eduardo",
	email: "eduardo@example.com",
	passwordHash: "password-hash",
	role: "admin",
	createdAt: dateProvider.now(),
	updatedAt: dateProvider.now(),
};
describe("User SQL DAO", () => {
	let connection: DatabaseConnectionFake;
	let dao: UserDAOSQL;
	beforeEach(() => {
		connection = new DatabaseConnectionFake();
		dao = new UserDAOSQL(connection);
	});
	it("should bind insert values and populate timestamps", async () => {
		await dao.save(row);
		const query = connection.lastQuery();
		expect(query.sql).toContain("INSERT INTO users");
		expect(query.sql).toContain("created_at, updated_at");
		expect(query.sql).toContain("CURRENT_TIMESTAMP");
		expect(query.params).toEqual([
			row.id,
			row.name,
			row.email,
			row.passwordHash,
			row.role,
		]);
		for (const value of query.params.filter((v) => typeof v === "string"))
			expect(query.sql).not.toContain(value as string);
	});
	it("should update fields and timestamp using the persisted id", async () => {
		await dao.update(row);
		const query = connection.lastQuery();
		expect(query.sql).toContain("UPDATE users SET");
		expect(query.sql).toContain("updated_at = CURRENT_TIMESTAMP");
		expect(query.sql).toContain("WHERE id = $5");
		expect(query.params).toEqual([
			row.name,
			row.email,
			row.passwordHash,
			row.role,
			row.id,
		]);
	});
	it("should bind the id on deletion", async () => {
		await dao.deleteById("id' OR 1=1 --");
		expect(connection.queries[0]).toEqual({
			sql: "DELETE FROM users WHERE id = $1",
			params: ["id' OR 1=1 --"],
		});
	});
	it("should find by id using bound parameters and camelCase aliases", async () => {
		connection.rows = [row];
		expect(await dao.findById("lookup")).toEqual(row);
		const query = connection.lastQuery();
		expect(query.params).toEqual(["lookup"]);
		expect(query.sql).toContain("WHERE id = $1");
		expect(query.sql).toContain('created_at AS "createdAt"');
		expect(query.sql).toContain('password_hash AS "passwordHash"');
	});
	it("should return null when id is missing", async () => {
		expect(await dao.findById("missing")).toEqual(null);
	});
	it("should find by email using bound parameters and camelCase aliases", async () => {
		connection.rows = [row];
		expect(await dao.findByEmail("lookup")).toEqual(row);
		const query = connection.lastQuery();
		expect(query.params).toEqual(["lookup"]);
		expect(query.sql).toContain("WHERE email = $1");
		expect(query.sql).toContain('created_at AS "createdAt"');
		expect(query.sql).toContain('password_hash AS "passwordHash"');
	});
	it("should return null when email is missing", async () => {
		expect(await dao.findByEmail("missing")).toEqual(null);
	});
	it("should find the first admin by creation date", async () => {
		connection.rows = [row];
		expect(await dao.findFirstAdmin()).toEqual(row);
		expect(connection.lastQuery()).toEqual({
			sql: 'SELECT id, name, email, password_hash AS "passwordHash", role, created_at AS "createdAt", updated_at AS "updatedAt" FROM users WHERE role = $1 ORDER BY created_at ASC LIMIT 1',
			params: ["admin"],
		});
	});
	it("should return null when no admin exists", async () => {
		expect(await dao.findFirstAdmin()).toBe(null);
	});
	it.each(["save", "update", "deleteById", "findById"] as const)(
		"should propagate errors from %s",
		async (method) => {
			const error = new Error("connection failed");
			connection.error = error;
			const call =
				method === "save" || method === "update"
					? dao[method](row)
					: dao[method](row.id);
			await expect(call).rejects.toBe(error);
		},
	);
	it.each(["save", "update"] as const)(
		"should translate duplicate email conflicts on %s",
		(method) => {
			connection.error = { code: "23505", constraint: "users_email_unique" };
			return expect(dao[method](row)).rejects.toBeInstanceOf(
				UserAlreadyExistsError,
			);
		},
	);
	it("should preserve unrelated unique constraint errors", () => {
		const error = { code: "23505", constraint: "users_pkey" };
		connection.error = error;
		return expect(dao.save(row)).rejects.toBe(error);
	});
});
