import { beforeEach, describe, expect, it } from "bun:test";
import { DatabaseConnectionFake } from "@test/support/fakes/DatabaseConnectionFake";
import { sessionRow as row } from "@test/support/fixtures/sessionRow";
import { SessionDAOSQL } from "@/external/database/DAOs/SessionDAOSQL";

describe("Session SQL DAO", () => {
	let connection: DatabaseConnectionFake;
	let dao: SessionDAOSQL;
	beforeEach(() => {
		connection = new DatabaseConnectionFake();
		dao = new SessionDAOSQL(connection);
	});
	it("should bind insert values and populate timestamps", async () => {
		await dao.save(row);
		const query = connection.lastQuery();
		expect(query.sql).toContain("INSERT INTO sessions");
		expect(query.sql).toContain("created_at, updated_at");
		expect(query.sql).toContain("CURRENT_TIMESTAMP");
		expect(query.params).toEqual([
			row.id,
			row.userId,
			row.tokenHash,
			row.expiresAt,
			row.revokedAt,
		]);
		for (const value of query.params.filter((v) => typeof v === "string"))
			expect(query.sql).not.toContain(value as string);
	});
	it("should update fields and timestamp using the persisted id", async () => {
		await dao.update(row);
		const query = connection.lastQuery();
		expect(query.sql).toContain("UPDATE sessions SET");
		expect(query.sql).toContain("updated_at = CURRENT_TIMESTAMP");
		expect(query.sql).toContain("WHERE id = $5");
		expect(query.params).toEqual([
			row.userId,
			row.tokenHash,
			row.expiresAt,
			row.revokedAt,
			row.id,
		]);
	});
	it("should bind the id on deletion", async () => {
		await dao.deleteById("id' OR 1=1 --");
		expect(connection.queries[0]).toEqual({
			sql: "DELETE FROM sessions WHERE id = $1",
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
		expect(query.sql).toContain('user_id AS "userId"');
		expect(query.sql).toContain('token_hash AS "tokenHash"');
		expect(query.sql).toContain('expires_at AS "expiresAt"');
		expect(query.sql).toContain('revoked_at AS "revokedAt"');
	});
	it("should return null when id is missing", async () => {
		expect(await dao.findById("missing")).toEqual(null);
	});
	it("should find by tokenHash using bound parameters and camelCase aliases", async () => {
		connection.rows = [row];
		expect(await dao.findByTokenHash("lookup")).toEqual(row);
		const query = connection.lastQuery();
		expect(query.params).toEqual(["lookup"]);
		expect(query.sql).toContain("WHERE token_hash = $1");
		expect(query.sql).toContain('created_at AS "createdAt"');
		expect(query.sql).toContain('user_id AS "userId"');
		expect(query.sql).toContain('token_hash AS "tokenHash"');
		expect(query.sql).toContain('expires_at AS "expiresAt"');
		expect(query.sql).toContain('revoked_at AS "revokedAt"');
	});
	it("should return null when tokenHash is missing", async () => {
		expect(await dao.findByTokenHash("missing")).toEqual(null);
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
			return expect(call).rejects.toBe(error);
		},
	);
});
