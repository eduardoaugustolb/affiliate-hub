import { beforeEach, describe, expect, it } from "bun:test";
import { ProductDAOFake } from "@test/support/fakes/ProductDAOFake";
import { productFake } from "@test/support/fixtures/productFake";
import { ProductNotFoundError } from "@/application/errors/ProductNotFoundError";
import { GetProductByCode } from "@/application/usecases/queries/GetProductByCode";
import type { ProductDAO } from "@/infra/database/DAOs/ProductDAO";

describe("GetProductByCode use case", () => {
	let productDao: ProductDAO;
	let usecase: GetProductByCode;

	beforeEach(async () => {
		productDao = new ProductDAOFake();

		await productDao.save(productFake);

		usecase = new GetProductByCode(productDao);
	});

	it.each([
		productFake.code,
		productFake.code.toLowerCase(),
		` ${productFake.code} `,
	])("returns a product DTO for code %s", (code) => {
		return expect(usecase.execute(undefined, { code })).resolves.toEqual({
			...productFake,
			createdAt: expect.any(Date),
			updatedAt: expect.any(Date),
		});
	});

	it("should throw ProductNotFoundError when no product is found", () => {
		expect(
			usecase.execute(undefined, { code: "invalid-code" }),
		).rejects.toBeInstanceOf(ProductNotFoundError);
	});

	it("should reject an empty code without querying the DAO", async () => {
		const findByCode = productDao.findByCode.bind(productDao);
		let wasQueried = false;
		productDao.findByCode = async (code) => {
			wasQueried = true;
			return findByCode(code);
		};

		expect(usecase.execute(undefined, { code: "  " })).rejects.toBeInstanceOf(
			ProductNotFoundError,
		);
		expect(wasQueried).toBe(false);
	});
});
