import { ProductCode } from "./ProductCode";
import { ProductDestinationUrl } from "./ProductDestinationUrl";

export class Product {
	private readonly code: ProductCode;
	private readonly destinationUrl: ProductDestinationUrl;
	private constructor(code: string, destinationUrl: string) {
		this.code = new ProductCode(code);
		this.destinationUrl = new ProductDestinationUrl(destinationUrl);
	}

	getCode(): ProductCode {
		return this.code;
	}

	getDestinationUrl(): ProductDestinationUrl {
		return this.destinationUrl;
	}

	static Create(code: string, destinationUrl: string) {
		return new Product(code, destinationUrl);
	}
}
