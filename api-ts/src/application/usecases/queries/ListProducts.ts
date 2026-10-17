import { BadRequestError } from "@/application/errors/BadRequestError";
import { ForbiddenOperationError } from "@/application/errors/ForbiddenOperationError";
import type {
	SessionActor,
	SessionAuthenticator,
} from "@/application/SessionAuthenticator";
import type { ProductDAO, ProductDTO } from "@/infra/database/DAOs/ProductDAO";
import type { Query } from "./Query";
export class ListProducts
	implements
		Query<SessionActor, { limit: number; offset: number }, ProductDTO[]>
{
	constructor(
		private readonly dao: ProductDAO,
		private readonly authenticator: SessionAuthenticator,
	) {}
	async execute(
		actor: SessionActor,
		input: { limit: number; offset: number },
	): Promise<ProductDTO[]> {
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
		return this.dao.list({ limit: input.limit, offset: input.offset });
	}
}
