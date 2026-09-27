import { DomainError } from "../errors/DomainError";

export class ProductMarketplace {
	private readonly marketplace: string;

	constructor(marketplace: string) {
		if (!ProductMarketplace.validate(marketplace)) {
			throw new DomainError("Invalid product marketplace");
		}
		this.marketplace = marketplace;
	}

	getValue(): string {
		return this.marketplace;
	}

	private static validate(marketplace: string): boolean {
		const trimmed = marketplace.trim();
		const allowedMarketplaces = ["shopee", "shein"];
		return allowedMarketplaces.includes(trimmed);
	}
}
