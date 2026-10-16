import { BadRequestError } from "@/application/errors/BadRequestError";
import { ForbiddenOperationError } from "@/application/errors/ForbiddenOperationError";
import type { ProductRepository } from "@/application/repositories/ProductRepository";
import type {
	SessionActor,
	SessionAuthenticator,
} from "@/application/SessionAuthenticator";
import type { Product } from "@/domain/entities/Product";
import type { Query } from "./Query";
export class ListProducts
	implements Query<SessionActor, { limit: number; offset: number }, Product[]>
{
	constructor(
		private readonly repo: ProductRepository,
		private readonly authenticator: SessionAuthenticator,
	) {}
	async execute(
		actor: SessionActor,
		input: { limit: number; offset: number },
	): Promise<Product[]> {
		const user = await this.authenticator.authenticate(actor);
		if (user.getRole() !== "admin")
			throw new ForbiddenOperationError("Only admins can list products");
		if (
			!Number.isInteger(input.limit) ||
			input.limit < 1 ||
			input.limit > 100 ||
			!Number.isInteger(input.offset) ||
			input.offset < 0
		)
			throw new BadRequestError("Invalid pagination");
		return this.repo.list(input.limit, input.offset);
	}
}
