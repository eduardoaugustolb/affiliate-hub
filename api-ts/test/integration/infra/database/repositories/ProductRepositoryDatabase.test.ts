import { beforeEach, describe, expect, it, spyOn } from "bun:test";
import { ProductDAOFake } from "@test/support/fakes/ProductDAOFake";
import { productRow as row } from "@test/support/fixtures/productRow";
import { Product } from "@/domain/entities/Product";
import { ProductRepositoryDatabase } from "@/infra/database/repositories/ProductRepositoryDatabase";

describe("ProductRepositoryDatabase", () => {
	let dao: ProductDAOFake;
	let repo: ProductRepositoryDatabase;
	beforeEach(() => {
		dao = new ProductDAOFake();
		repo = new ProductRepositoryDatabase(dao, { generate: () => row.id });
	});
	it("should generate an id and persist all fields on creation", async () => {
		const entity = Product.create(
			row.code,
			row.destinationUrl,
			row.marketplace,
			row.imageUrl,
			row.status,
		);
		await repo.save(entity);
		const stored = await dao.findById(row.id);
		expect(stored).toMatchObject({
			...row,
			createdAt: expect.any(Date),
			updatedAt: expect.any(Date),
		});
		expect(entity.getId()).toBe("");
	});
	it("should preserve an existing id when saving", async () => {
		const entity = Product.rehydrate(
			row.id,
			row.code,
			row.destinationUrl,
			row.marketplace,
			row.imageUrl,
			row.status,
		);
		await repo.save(entity);
		expect(await dao.findById(row.id)).toMatchObject({
			...row,
			createdAt: expect.any(Date),
			updatedAt: expect.any(Date),
		});
	});
	it("should rehydrate all fields when finding by id", async () => {
		await dao.save(row);
		const entity = await repo.findById(row.id);
		expect(entity).toBeInstanceOf(Product);
		expect(entity?.getId()).toBe(row.id);
		expect(entity?.getCode()).toEqual(row.code);
		expect(entity?.getDestinationUrl()).toEqual(row.destinationUrl);
		expect(entity?.getMarketplace()).toEqual(row.marketplace);
		expect(entity?.getImageUrl()).toEqual(row.imageUrl);
		expect(entity?.getStatus()).toEqual(row.status);
	});
	it("should return undefined when id is missing", async () => {
		expect(await repo.findById("missing")).toBe(undefined);
	});
	it("should propagate lookup errors for id", async () => {
		const error = new Error("database unavailable");
		spyOn(dao, "findById").mockRejectedValueOnce(error);
		return expect(repo.findById("missing")).rejects.toBe(error);
	});
	it("should rehydrate all fields when finding by code", async () => {
		await dao.save(row);
		const entity = await repo.findByCode(row.code);
		expect(entity).toBeInstanceOf(Product);
		expect(entity?.getId()).toBe(row.id);
		expect(entity?.getCode()).toEqual(row.code);
		expect(entity?.getDestinationUrl()).toEqual(row.destinationUrl);
		expect(entity?.getMarketplace()).toEqual(row.marketplace);
		expect(entity?.getImageUrl()).toEqual(row.imageUrl);
		expect(entity?.getStatus()).toEqual(row.status);
	});
	it("should return undefined when code is missing", async () => {
		expect(await repo.findByCode("missing")).toBe(undefined);
	});
	it("should propagate lookup errors for code", async () => {
		const error = new Error("database unavailable");
		spyOn(dao, "findByCode").mockRejectedValueOnce(error);
		return expect(repo.findByCode("missing")).rejects.toBe(error);
	});
	it("should update persisted data", async () => {
		await dao.save(row);
		const entity = Product.rehydrate(
			row.id,
			row.code,
			row.destinationUrl,
			row.marketplace,
			row.imageUrl,
			row.status,
		);
		const update = spyOn(dao, "update");
		await repo.update(entity);
		expect(update).toHaveBeenCalledWith({
			id: row.id,
			code: row.code,
			destinationUrl: row.destinationUrl,
			marketplace: row.marketplace,
			imageUrl: row.imageUrl,
			status: row.status,
			name: row.name,
		});
	});
	it("should reject updates without an id", async () => {
		const update = spyOn(dao, "update");
		expect(
			repo.update(
				Product.create(
					row.code,
					row.destinationUrl,
					row.marketplace,
					row.imageUrl,
					row.status,
				),
			),
		).rejects.toThrow("without an id");
		expect(update).not.toHaveBeenCalled();
	});
	it("should delete a persisted entity", async () => {
		await dao.save(row);
		await repo.remove(row.id);
		expect(await repo.findById(row.id)).toBe(undefined);
	});
	it("should propagate save errors", async () => {
		const error = new Error("insert failed");
		spyOn(dao, "save").mockRejectedValueOnce(error);
		return expect(
			repo.save(
				Product.create(
					row.code,
					row.destinationUrl,
					row.marketplace,
					row.imageUrl,
					row.status,
				),
			),
		).rejects.toBe(error);
	});
	it("should propagate update errors", async () => {
		const error = new Error("update failed");
		spyOn(dao, "update").mockRejectedValueOnce(error);
		return expect(
			repo.update(
				Product.rehydrate(
					row.id,
					row.code,
					row.destinationUrl,
					row.marketplace,
					row.imageUrl,
					row.status,
				),
			),
		).rejects.toBe(error);
	});
	it("should propagate deletion errors", async () => {
		const error = new Error("delete failed");
		spyOn(dao, "remove").mockRejectedValueOnce(error);
		return expect(repo.remove(row.id)).rejects.toBe(error);
	});
});
