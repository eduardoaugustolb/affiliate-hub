import { ForbiddenOperationError } from "@/application/errors/ForbiddenOperationError";
import { ProductNotFoundError } from "@/application/errors/ProductNotFoundError";
import type { ProductRepository } from "@/application/repositories/ProductRepository";
import type {
	SessionActor,
	SessionAuthenticator,
} from "@/application/SessionAuthenticator";
import { Product } from "@/domain/entities/Product";
import type { Command } from "./Command";

export type UpdateProductInput = {
	name: string;
	code: string;
	destinationUrl: string;
	marketplace: string;
	imageUrl: string;
	status: string;
};

export class UpdateProduct
	implements Command<SessionActor, UpdateProductInput>
{
	constructor(
		private readonly repo: ProductRepository,
		private readonly sessionAuthenticator: SessionAuthenticator,
	) {}
	async execute(actor: SessionActor, input: UpdateProductInput): Promise<void> {
		const user = await this.sessionAuthenticator.authenticate(actor);
		if (user.getRole() !== "admin")
			throw new ForbiddenOperationError("Only admins can update products");
		const code = input.code.trim().toUpperCase();
		if (!code) throw new ProductNotFoundError(code);
		const product = await this.repo.findByCode(code);
		if (!product) throw new ProductNotFoundError(code);
		const updated = Product.rehydrate(
			product.getId(),
			product.getCode(),
			input.destinationUrl,
			input.marketplace,
			input.imageUrl,
			input.status,
			input.name,
		);
		await this.repo.update(updated);
		return;
	}
}
