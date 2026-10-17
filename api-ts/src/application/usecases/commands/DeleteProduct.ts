import { ForbiddenOperationError } from "@/application/errors/ForbiddenOperationError";
import { ProductNotFoundError } from "@/application/errors/ProductNotFoundError";
import type { ProductRepository } from "@/application/repositories/ProductRepository";
import type {
	SessionActor,
	SessionAuthenticator,
} from "@/application/SessionAuthenticator";
import type { Command } from "./Command";

export type DeleteProductInput = { code: string };

export class DeleteProduct
	implements Command<SessionActor, DeleteProductInput>
{
	constructor(
		private readonly repo: ProductRepository,
		private readonly sessionAuthenticator: SessionAuthenticator,
	) {}
	async execute(actor: SessionActor, input: DeleteProductInput): Promise<void> {
		const user = await this.sessionAuthenticator.authenticate(actor);
		if (user.getRole() !== "admin")
			throw new ForbiddenOperationError("Only admins can delete products");
		const code = input.code.trim().toUpperCase();
		if (!code) throw new ProductNotFoundError(code);
		const product = await this.repo.findByCode(code);
		if (!product) throw new ProductNotFoundError(code);
		await this.repo.remove(product.getId());
		return;
	}
}
