import { ProductNotFoundError } from "@/application/errors/ProductNotFoundError";
import { ProductUnavailableError } from "@/application/errors/ProductUnavailableError";
import type { ProductRepository } from "@/application/repositories/ProductRepository";
import { ProductCode } from "@/domain/entities/ProductCode";
import type { Query } from "./Query";
export class ResolveProduct
	implements Query<undefined, { code: string }, string>
{
	constructor(private readonly repo: ProductRepository) {}
	async execute(_: undefined, input: { code: string }): Promise<string> {
		let code: string;
		try {
			code = new ProductCode(input.code, true).getValue();
		} catch {
			throw new ProductNotFoundError(input.code);
		}
		const product = await this.repo.findByCode(code);
		if (!product) throw new ProductNotFoundError(code);
		if (product.getStatus() !== "active") throw new ProductUnavailableError();
		return product.getDestinationUrl();
	}
}
