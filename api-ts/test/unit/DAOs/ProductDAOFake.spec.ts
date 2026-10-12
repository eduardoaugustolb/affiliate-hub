import { beforeEach, describe, expect, it } from "bun:test";
import { ProductDAOFake } from "../mocks/ProductDAOFake";

const row = {
	id: "id-1",
	code: "ABC123",
	destinationUrl: "https://example.com",
	marketplace: "shein",
	imageUrl: "https://example.com/image.jpg",
	status: "active",
};
describe("Product DAO fake", () => {
	let dao: ProductDAOFake;
	beforeEach(() => {
		dao = new ProductDAOFake();
	});
	it("should store and retrieve records", async () => {
		await dao.save(row);
		expect(await dao.findById(row.id)).toMatchObject(row);
		expect(await dao.findByCode("ABC123")).toMatchObject(row);
	});
	it("should reject duplicate ids without overwriting existing data", async () => {
		await dao.save(row);
		expect(dao.save({ ...row, code: "different" })).rejects.toThrow(
			"Duplicate id",
		);
		expect(await dao.findById(row.id)).toMatchObject(row);
	});
	it("should reject duplicate unique values on insert", async () => {
		await dao.save(row);
		expect(dao.save({ ...row, id: "id-2" })).rejects.toThrow();
		expect(await dao.findById("id-2")).toBe(undefined);
	});
	it("should reject duplicate unique values on update", async () => {
		await dao.save(row);
		await dao.save({ ...row, id: "id-2", code: "different" });
		expect(dao.update({ ...row, id: "id-2" })).rejects.toThrow();
		expect((await dao.findById("id-2"))?.code).toBe("different");
	});
	it("should update data while preserving creation time", async () => {
		await dao.save(row);
		const before = await dao.findById(row.id);
		await dao.update({ ...row, code: "different" });
		const after = await dao.findById(row.id);
		expect(after?.code).toBe("different");
		expect(after?.createdAt.getTime()).toBe(before?.createdAt.getTime());
		expect(after?.updatedAt.getTime()).toBeGreaterThanOrEqual(
			before?.updatedAt.getTime() ?? 0,
		);
	});
	it("should not insert on update of a missing record", async () => {
		await dao.update(row);
		expect(await dao.findById(row.id)).toBe(undefined);
	});
	it("should delete a record and tolerate missing records", async () => {
		await dao.save(row);
		await dao.remove(row.id);
		await dao.remove(row.id);
		expect(await dao.findById(row.id)).toBe(undefined);
	});
});
