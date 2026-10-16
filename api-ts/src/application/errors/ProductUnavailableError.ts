export class ProductUnavailableError extends Error {
	readonly code = "PRODUCT_UNAVAILABLE";
	constructor() {
		super("Product is unavailable");
	}
}
