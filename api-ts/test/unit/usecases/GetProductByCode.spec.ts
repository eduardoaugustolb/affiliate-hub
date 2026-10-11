import { beforeEach, describe, expect, it } from "bun:test";
import { ProductNotFoundError } from "@/application/errors/ProductNotFoundError";
import type { IdGenerator } from "@/application/IdGenerator";
import type { ProductRepository } from "@/application/repositories/ProductRepository";
import { GetProductByCode } from "@/application/usecases/GetProductByCode";
import { Product } from "@/domain/entities/Product";
import { IdGeneratorFake } from "../../mocks/IdGeneratorFake";
import { productFake } from "../../mocks/ProductFake";
import { ProductRepositoryFake } from "../../mocks/ProductRepositoryFake";

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
});
