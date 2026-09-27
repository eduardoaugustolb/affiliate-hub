import { DomainError } from "../errors/DomainError";

export class ProductImageUrl {
	private readonly url: string;

	constructor(url: string) {
		if (!ProductImageUrl.validate(url)) {
			throw new DomainError("Invalid product image URL");
		}
		this.url = url;
	}

	getValue(): string {
		return this.url;
	}

	private static validate(rawUrl: string): boolean {
		const regex =
			/^https:\/\/(?:[a-zA-Z0-9-]+\.)+[a-zA-Z]{2,}(?::\d{1,5})?(?:\/[^\s?#]*)?(?:\?[^\s#]*)?(?:#[^\s]*)?$/;

		return regex.test(rawUrl.trim());
	}
}
