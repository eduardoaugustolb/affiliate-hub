export class ProductCodeAlreadyExistsError extends Error {
	code = "PRODUCT_CODE_ALREADY_EXISTS";
	constructor() {
		super("Product code already exists");
		this.name = "ProductCodeAlreadyExistsError";
	}
}
