import { describe, expect, it } from "bun:test";
import { ProductDestinationUrl } from "@/domain/entities/ProductDestinationUrl";
import { DomainError } from "@/domain/errors/DomainError";

describe("ProductDestinationUrl entity", () => {
	it("should create a valid ProductDestinationUrl", () => {
		const url = "https://example.com/product/123";
		const productDestinationUrl = new ProductDestinationUrl(url);
		expect(productDestinationUrl).toBeTruthy();
		expect(productDestinationUrl).toBeInstanceOf(ProductDestinationUrl);
		expect(productDestinationUrl.getValue()).toBe(url);
	});

	it.each(["http://example.com", "example", "", "example.com"])(
		"should throw an error when creating a ProductDestinationUrl with an invalid url",
		(url) => {
			expect(() => new ProductDestinationUrl(url)).toThrow(
				new DomainError("Invalid product destination URL"),
			);
		},
	);
});
