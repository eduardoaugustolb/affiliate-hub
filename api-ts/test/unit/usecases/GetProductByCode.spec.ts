import { beforeEach, describe, expect, it } from "bun:test";
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

		productRepo.save(
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
		expect(usecase.execute({ code: productFake.code })).resolves.toBeInstanceOf(
			Product,
		);
	});

	it("should return null if no product is found", () => {
		expect(usecase.execute({ code: "invalid-code" })).resolves.toBeUndefined();
	});
});
