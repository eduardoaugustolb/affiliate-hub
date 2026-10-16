import { ForbiddenOperationError } from "@/application/errors/ForbiddenOperationError";
import type {
	SessionActor,
	SessionAuthenticator,
} from "@/application/SessionAuthenticator";
import { Product } from "@/domain/entities/Product";
import { ApplicationError } from "../../errors/ApplicationError";
import { ProductCodeAlreadyExistsError } from "../../errors/ProductCodeAlreadyExistsError";
import type { ProductCodeGenerator } from "../../ProductCodeGenerator";
import type { ProductRepository } from "../../repositories/ProductRepository";
import type { Command } from "./Command";

type CreateProductInput = {
	name: string;
	destinationUrl: string;
	marketplace: string;
	imageUrl: string;
	status: string;
};

type CreateProductOutput = { code: string };

type CreateProductActor = SessionActor;

export class CreateProduct
	implements
		Command<CreateProductActor, CreateProductInput, CreateProductOutput>
{
	constructor(
		private readonly repo: ProductRepository,
		private readonly productCodeGenerator: ProductCodeGenerator,
		private readonly sessionAuthenticator: SessionAuthenticator,
	) {}

	async execute(
		actor: CreateProductActor,
		input: CreateProductInput,
	): Promise<CreateProductOutput> {
		const user = await this.sessionAuthenticator.authenticate(actor);
		if (user.getRole() !== "admin")
			throw new ForbiddenOperationError("Only admins can create products");
		const maxRetries = 10;

		for (let retries = 0; retries < maxRetries; retries++) {
			const code = this.productCodeGenerator.generate();

			const product = Product.create(
				code,
				input.destinationUrl,
				input.marketplace,
				input.imageUrl,
				input.status,
				input.name,
			);

			try {
				await this.repo.save(product);
				return { code: product.getCode() };
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
