import { ForbiddenOperationError } from "@/application/errors/ForbiddenOperationError";
import { productOptionIds } from "@/application/ProductOptionIds";
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
	imageUrl?: string;
	imageUrls?: string[];
	status: string;
	optionIds?: string[];
};

type CreateProductActor = SessionActor;

export class CreateProduct
	implements Command<CreateProductActor, CreateProductInput>
{
	constructor(
		private readonly repo: ProductRepository,
		private readonly productCodeGenerator: ProductCodeGenerator,
		private readonly sessionAuthenticator: SessionAuthenticator,
	) {}

	async execute(
		actor: CreateProductActor,
		input: CreateProductInput,
	): Promise<void> {
		const user = await this.sessionAuthenticator.authenticate(actor);
		if (user.getRole() !== "admin")
			throw new ForbiddenOperationError("Only admins can create products");
		const optionIds = productOptionIds(input.optionIds);
		const maxRetries = 10;

		for (let retries = 0; retries < maxRetries; retries++) {
			const code = this.productCodeGenerator.generate();

			const product = Product.create(
				code,
				input.destinationUrl,
				input.marketplace,
				input.imageUrl ?? "",
				input.status,
				input.name,
				input.imageUrls,
			);

			try {
				await this.repo.save(product, optionIds);
				return;
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
