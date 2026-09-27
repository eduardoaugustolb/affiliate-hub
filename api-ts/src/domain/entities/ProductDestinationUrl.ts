import { DomainError } from "../errors/DomainError";

export class ProductDestinationUrl {
	private url: string;

	constructor(url: string) {
		if (!ProductDestinationUrl.validate(url)) {
			throw new DomainError("Invalid product destination URL");
		}
		this.url = url;
	}

	public getValue(): string {
		return this.url;
	}

	private static validate(url: string): boolean {
		const trimmedUrl = url.trim();
		const urlRegex =
			/^https:\/\/(?:[a-zA-Z0-9-]+\.)+[a-zA-Z]{2,}(?::\d{1,5})?(?:\/[^\s?#]*)?(?:\?[^\s#]*)?(?:#[^\s]*)?$/;
		return urlRegex.test(trimmedUrl);
	}
}
