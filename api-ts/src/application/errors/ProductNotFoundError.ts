export class ProductNotFoundError extends Error {
	readonly code = "PRODUCT_NOT_FOUND";

	constructor(productCode: string) {
		super(`Product with code ${productCode} was not found`);
		this.name = "ProductNotFoundError";
	}
}
