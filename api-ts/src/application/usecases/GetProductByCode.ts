import type { Product } from "@/domain/entities/Product";
import type { ProductRepository } from "../repositories/ProductRepository";
import type { UseCase } from "./UseCase";

interface GetProductByCodeInput {
	code: string;
}

export class GetProductByCode
	implements UseCase<GetProductByCodeInput, Product | undefined>
{
	constructor(private productRepository: ProductRepository) {}

	async execute(input: GetProductByCodeInput): Promise<Product | undefined> {
		const { code } = input;
		const product = await this.productRepository.findByCode(code);
		return product;
	}
}
