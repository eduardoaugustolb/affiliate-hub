import { DomainError } from "../errors/DomainError";
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
	private readonly imageUrls: string[];
	private readonly status: ProductStatus;

	private constructor(
		private id: string,
		code: string,
		destinationUrl: string,
		marketplace: string,
		imageUrl: string,
		status: string,
		private readonly name: string,
		legacyCode = false,
		imageUrls?: string[],
	) {
		if (!name.trim() || name.trim().length > 160)
			throw new DomainError("Invalid product name");
		this.name = name.trim();
		this.code = new ProductCode(code, legacyCode);
		this.destinationUrl = new ProductDestinationUrl(destinationUrl);
		this.marketplace = new ProductMarketplace(marketplace);
		if (
			imageUrls !== undefined &&
			(!Array.isArray(imageUrls) ||
				!imageUrls.length ||
				imageUrls.length > 20 ||
				imageUrls.some((url) => typeof url !== "string"))
		)
			throw new DomainError("Product images must contain 1 to 20 HTTPS URLs");
		this.imageUrls = [
			...new Set(
				(imageUrls ?? [imageUrl]).map((url) =>
					new ProductImageUrl(url).getValue(),
				),
			),
		];
		this.imageUrl = new ProductImageUrl(this.imageUrls[0] ?? imageUrl);
		this.status = new ProductStatus(status);
	}

	getName(): string {
		return this.name;
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

	getImageUrls(): string[] {
		return [...this.imageUrls];
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
		name = "Produto",
		imageUrls?: string[],
	) {
		return new Product(
			"",
			code,
			destinationUrl,
			marketplace,
			imageUrl,
			status,
			name,
			false,
			imageUrls,
		);
	}

	static rehydrate(
		id: string,
		code: string,
		destinationUrl: string,
		marketplace: string,
		imageUrl: string,
		status: string,
		name = "Produto",
		imageUrls?: string[],
	) {
		return new Product(
			id,
			code,
			destinationUrl,
			marketplace,
			imageUrl,
			status,
			name,
			true,
			imageUrls,
		);
	}
}
