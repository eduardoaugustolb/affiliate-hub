import { beforeEach, describe, expect, it } from "bun:test";
import { UserAlreadyExistsError } from "@/application/errors/UserAlreadyExistsError";
import { UserDAOFake } from "../mocks/UserDAOFake";

const row = {
	id: "id-1",
	name: "Eduardo",
	email: "eduardo@example.com",
	passwordHash: "hash",
	role: "admin",
};
describe("User DAO fake", () => {
	let dao: UserDAOFake;
	beforeEach(() => {
		dao = new UserDAOFake();
	});
	it("should store and retrieve records", async () => {
		await dao.save(row);
		expect(await dao.findById(row.id)).toMatchObject(row);
		expect(await dao.findByEmail("eduardo@example.com")).toMatchObject(row);
	});
	it("should find the first admin and return null when none exists", async () => {
		expect(await dao.findFirstAdmin()).toBe(null);
		await dao.save(row);
		expect(await dao.findFirstAdmin()).toMatchObject(row);
	});
	it("should reject duplicate ids without overwriting existing data", async () => {
		await dao.save(row);
		await expect(dao.save({ ...row, email: "different" })).rejects.toThrow(
			"Duplicate id",
		);
		expect(await dao.findById(row.id)).toMatchObject(row);
	});
	it("should reject duplicate emails on insert", async () => {
		await dao.save(row);
		return expect(dao.save({ ...row, id: "id-2" })).rejects.toBeInstanceOf(
			UserAlreadyExistsError,
		);
	});
	it("should reject duplicate unique values on update", async () => {
		await dao.save(row);
		await dao.save({ ...row, id: "id-2", email: "different" });
		await expect(dao.update({ ...row, id: "id-2" })).rejects.toThrow();
		expect((await dao.findById("id-2"))?.email).toBe("different");
	});
	it("should update data while preserving creation time", async () => {
		await dao.save(row);
		const before = await dao.findById(row.id);
		await dao.update({ ...row, email: "different" });
		const after = await dao.findById(row.id);
		expect(after?.email).toBe("different");
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
