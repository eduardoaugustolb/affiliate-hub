import type { ProductDAO, ProductDTO } from "@/infra/database/DAOs/ProductDAO";
import { ProductNotFoundError } from "../../errors/ProductNotFoundError";
import type { Query } from "./Query";

interface GetProductByCodeInput {
	code: string;
}

export class GetProductByCode
	implements Query<undefined, GetProductByCodeInput, ProductDTO>
{
	constructor(private productDAO: ProductDAO) {}

	async execute(
		_: undefined,
		input: GetProductByCodeInput,
	): Promise<ProductDTO> {
		const code = input.code.trim().toUpperCase();
		if (!code) throw new ProductNotFoundError(code);
		const product = await this.productDAO.findByCode({ code: code });
		if (!product) throw new ProductNotFoundError(code);

		return product;
	}
}
