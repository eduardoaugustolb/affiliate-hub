import { Product } from "@/domain/entities/Product";
import { ApplicationError } from "../errors/ApplicationError";
import { ProductCodeAlreadyExistsError } from "../errors/ProductCodeAlreadyExistsError";
import type { ProductCodeGenerator } from "../ProductCodeGenerator";
import type { ProductRepository } from "../repositories/ProductRepository";
import type { UseCase } from "./UseCase";

type CreateProductInput = {
	destinationUrl: string;
	marketplace: string;
	imageUrl: string;
	status: string;
};

type CreateProductOutput = undefined;

export class CreateProduct
	implements UseCase<CreateProductInput, CreateProductOutput>
{
	constructor(
		private readonly repo: ProductRepository,
		private readonly productCodeGenerator: ProductCodeGenerator,
	) {}

	async execute(input: CreateProductInput): Promise<CreateProductOutput> {
		const maxRetries = 10;

		for (let retries = 0; retries < maxRetries; retries++) {
			const code = this.productCodeGenerator.generate();

			const product = Product.create(
				code,
				input.destinationUrl,
				input.marketplace,
				input.imageUrl,
				input.status,
			);

			try {
				await this.repo.save(product);
				return undefined;
			} catch (error) {
				if (error instanceof ProductCodeAlreadyExistsError) {
					continue;
				}

				throw error;
			}
		}

		throw new ApplicationError("Failed to generate unique code");
	}
}
