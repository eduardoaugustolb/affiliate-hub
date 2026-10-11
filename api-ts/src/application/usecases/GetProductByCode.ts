import type { Product } from "@/domain/entities/Product";
import { ProductNotFoundError } from "../errors/ProductNotFoundError";
import type { ProductRepository } from "../repositories/ProductRepository";
import type { UseCase } from "./UseCase";

interface GetProductByCodeInput {
	code: string;
}

export class GetProductByCode
	implements UseCase<undefined, GetProductByCodeInput, Product>
{
	constructor(private productRepository: ProductRepository) {}

	async execute(_: undefined, input: GetProductByCodeInput): Promise<Product> {
		const { code } = input;
		const product = await this.productRepository.findByCode(code);
		if (!product) throw new ProductNotFoundError(code);
		return product;
	}
}
