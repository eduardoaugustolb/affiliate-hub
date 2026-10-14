import { beforeEach, describe, expect, it } from "bun:test";
import { IdGeneratorFake } from "@test/support/fakes/IdGeneratorFake";
import { ProductRepositoryFake } from "@test/support/fakes/ProductRepositoryFake";
import { productFake } from "@test/support/fixtures/productFake";
import { ProductNotFoundError } from "@/application/errors/ProductNotFoundError";
import type { IdGenerator } from "@/application/IdGenerator";
import type { ProductRepository } from "@/application/repositories/ProductRepository";
import { GetProductByCode } from "@/application/usecases/queries/GetProductByCode";
import { Product } from "@/domain/entities/Product";

describe("GetProductByCode use case", () => {
	let productRepo: ProductRepository;
	let idGenerator: IdGenerator;
	let usecase: GetProductByCode;

	beforeEach(() => {
		idGenerator = new IdGeneratorFake();
		productRepo = new ProductRepositoryFake(idGenerator);

		void productRepo.save(
			Product.create(
				productFake.code,
				productFake.destinationUrl,
				productFake.marketplace,
				productFake.imageUrl,
				productFake.status,
			),
		);

		usecase = new GetProductByCode(productRepo);
	});

	it("should return a product", () => {
		return expect(
			usecase.execute(undefined, { code: productFake.code }),
		).resolves.toBeInstanceOf(Product);
	});

	it("should throw ProductNotFoundError when no product is found", () => {
		return expect(
			usecase.execute(undefined, { code: "invalid-code" }),
		).rejects.toBeInstanceOf(ProductNotFoundError);
	});

	it("should reject an empty code without querying the repository", async () => {
		const findByCode = productRepo.findByCode.bind(productRepo);
		let wasQueried = false;
		productRepo.findByCode = async (code) => {
			wasQueried = true;
			return findByCode(code);
		};

		expect(usecase.execute(undefined, { code: "  " })).rejects.toBeInstanceOf(
			ProductNotFoundError,
		);
		expect(wasQueried).toBe(false);
	});
});
