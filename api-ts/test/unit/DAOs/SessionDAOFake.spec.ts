import { beforeEach, describe, expect, it } from "bun:test";
import { SessionDAOFake } from "../mocks/SessionDAOFake";

const row = {
	id: "id-1",
	userId: "user-1",
	tokenHash: "hash",
	expiresAt: new Date("2030-01-01T00:00:00Z"),
	revokedAt: null,
};
describe("Session DAO fake", () => {
	let dao: SessionDAOFake;
	beforeEach(() => {
		dao = new SessionDAOFake();
	});
	it("should store and retrieve records", async () => {
		await dao.save(row);
		expect(await dao.findById(row.id)).toMatchObject(row);
		expect(await dao.findByTokenHash("hash")).toMatchObject(row);
	});
	it("should reject duplicate ids without overwriting existing data", async () => {
		await dao.save(row);
		expect(dao.save({ ...row, tokenHash: "different" })).rejects.toThrow(
			"Duplicate id",
		);
		expect(await dao.findById(row.id)).toMatchObject(row);
	});
	it("should reject duplicate unique values on insert", async () => {
		await dao.save(row);
		expect(dao.save({ ...row, id: "id-2" })).rejects.toThrow();
		expect(await dao.findById("id-2")).toBe(null);
	});
	it("should reject duplicate unique values on update", async () => {
		await dao.save(row);
		await dao.save({ ...row, id: "id-2", tokenHash: "different" });
		expect(dao.update({ ...row, id: "id-2" })).rejects.toThrow();
		expect((await dao.findById("id-2"))?.tokenHash).toBe("different");
	});
	it("should update data while preserving creation time", async () => {
		await dao.save(row);
		const before = await dao.findById(row.id);
		await dao.update({ ...row, tokenHash: "different" });
		const after = await dao.findById(row.id);
		expect(after?.tokenHash).toBe("different");
		expect(after?.createdAt.getTime()).toBe(before?.createdAt.getTime());
		expect(after?.updatedAt.getTime()).toBeGreaterThanOrEqual(
			before?.updatedAt.getTime() ?? 0,
		);
	});
	it("should not insert on update of a missing record", async () => {
		await dao.update(row);
		expect(await dao.findById(row.id)).toBe(null);
	});
	it("should delete a record and tolerate missing records", async () => {
		await dao.save(row);
		await dao.deleteById(row.id);
		await dao.deleteById(row.id);
		expect(await dao.findById(row.id)).toBe(null);
	});
});
