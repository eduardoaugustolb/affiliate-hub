import { ProductCode } from "./ProductCode";
import { ProductDestinationUrl } from "./ProductDestinationUrl";
import { ProductImageUrl } from "./ProductImageUrl";
import { ProductMarketplace } from "./ProductMarketplace";
import { ProductStatus } from "./ProductStatus";

export class Product {
	private readonly code: ProductCode;
	private readonly destinationUrl: ProductDestinationUrl;
	private readonly marketplace: ProductMarketplace;
	private readonly imageUrl: ProductImageUrl;
	private readonly status: ProductStatus;

	private constructor(
		private id: string,
		code: string,
		destinationUrl: string,
		marketplace: string,
		imageUrl: string,
		status: string,
	) {
		this.code = new ProductCode(code);
		this.destinationUrl = new ProductDestinationUrl(destinationUrl);
		this.marketplace = new ProductMarketplace(marketplace);
		this.imageUrl = new ProductImageUrl(imageUrl);
		this.status = new ProductStatus(status);
	}

	getId(): string {
		return this.id;
	}

	getCode(): string {
		return this.code.getValue();
	}

	getDestinationUrl(): string {
		return this.destinationUrl.getValue();
	}

	getMarketplace(): string {
		return this.marketplace.getValue();
	}

	getImageUrl(): string {
		return this.imageUrl.getValue();
	}

	getStatus(): string {
		return this.status.getValue();
	}

	static create(
		code: string,
		destinationUrl: string,
		marketplace: string,
		imageUrl: string,
		status: string,
	) {
		return new Product("", code, destinationUrl, marketplace, imageUrl, status);
	}

	static rehydrate(
		id: string,
		code: string,
		destinationUrl: string,
		marketplace: string,
		imageUrl: string,
		status: string,
	) {
		return new Product(id, code, destinationUrl, marketplace, imageUrl, status);
	}
}
