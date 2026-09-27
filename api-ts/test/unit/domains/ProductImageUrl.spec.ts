import { describe, expect, it } from "bun:test";
import { ProductImageUrl } from "@/domain/entities/ProductImageUrl";
import { DomainError } from "@/domain/errors/DomainError";

describe("ProductImageUrl entity", () => {
	it("should create a valid ProductImageUrl", () => {
		const url = "https://example.com/product/123";
		const productImageUrl = new ProductImageUrl(url);
		expect(productImageUrl).toBeTruthy();
		expect(productImageUrl).toBeInstanceOf(ProductImageUrl);
		expect(productImageUrl.getValue()).toBe(url);
	});

	it.each(["http://example.com", "example", "", "example.com"])(
		"should throw an error when creating a ProductImageUrl with an invalid url",
		(url) => {
			expect(() => new ProductImageUrl(url)).toThrow(
				new DomainError("Invalid product image URL"),
			);
		},
	);
});
