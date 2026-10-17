import { ProductNotFoundError } from "@/application/errors/ProductNotFoundError";
import { ProductUnavailableError } from "@/application/errors/ProductUnavailableError";
import { ProductCode } from "@/domain/entities/ProductCode";
import type { ProductDAO } from "@/infra/database/DAOs/ProductDAO";
import type { Query } from "./Query";
export type ResolveProductOutput = { destinationUrl: string };

export class ResolveProduct
	implements Query<undefined, { code: string }, ResolveProductOutput>
{
	constructor(private readonly dao: ProductDAO) {}
	async execute(
		_: undefined,
		input: { code: string },
	): Promise<ResolveProductOutput> {
		let code: string;
		try {
			code = new ProductCode(input.code, true).getValue();
		} catch {
			throw new ProductNotFoundError(input.code);
		}
		const product = await this.dao.findByCode({ code });
		if (!product) throw new ProductNotFoundError(code);
		if (product.status !== "active") throw new ProductUnavailableError();
		return { destinationUrl: product.destinationUrl };
	}
}
