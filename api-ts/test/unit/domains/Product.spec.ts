import { describe, expect, it } from "bun:test";
import { Product } from "@/domain/entities/Product";
import { DomainError } from "@/domain/errors/DomainError";
import { productFake } from "../../mocks/ProductFake";

describe("Product entity", () => {
	it("should create a product with valid data", () => {
		const product = Product.create(
			productFake.id,
			productFake.code,
			productFake.destinationUrl,
			productFake.marketplace,
			productFake.imageUrl,
			productFake.status,
		);

		expect(product).toBeTruthy();
		expect(product.getId()).toBe(productFake.id);
		expect(product.getCode().getValue()).toBe(productFake.code);
		expect(product.getDestinationUrl().getValue()).toBe(
			productFake.destinationUrl,
		);
		expect(product.getMarketplace().getValue()).toBe(productFake.marketplace);
		expect(product.getImageUrl().getValue()).toBe(productFake.imageUrl);
		expect(product.getStatus().getValue()).toBe(productFake.status);
	});
	it.each(["I", "O", "0", ""])(
		"should reject product creation with an invalid code",
		(code) => {
			expect(() =>
				Product.create(
					productFake.id,
					code,
					productFake.destinationUrl,
					productFake.marketplace,
					productFake.imageUrl,
					productFake.status,
				),
			).toThrow(new DomainError("Invalid product code"));
		},
	);

	it.each(["http://example.com", "example", "example.com", ""])(
		"should reject product creation with an invalid destination url",
		(destinationUrl) => {
			expect(() =>
				Product.create(
					productFake.id,
					productFake.code,
					destinationUrl,
					productFake.marketplace,
					productFake.imageUrl,
					productFake.status,
				),
			).toThrow(new DomainError("Invalid product destination URL"));
		},
	);

	it.each(["http://example.com", "example", "example.com", ""])(
		"should reject product creation with an invalid image url",
		(imageUrl) => {
			expect(() =>
				Product.create(
					productFake.id,
					productFake.code,
					productFake.destinationUrl,
					productFake.marketplace,
					imageUrl,
					productFake.status,
				),
			).toThrow(new DomainError("Invalid product image URL"));
		},
	);

	it.each(["", "invalid-marketplace"])(
		"should reject product creation with an invalid marketplace",
		(marketplace) => {
			expect(() =>
				Product.create(
					productFake.id,
					productFake.code,
					productFake.destinationUrl,
					marketplace,
					productFake.imageUrl,
					productFake.status,
				),
			).toThrow(new DomainError("Invalid product marketplace"));
		},
	);

	it.each(["", "invalid-status"])(
		"should reject product creation with an invalid status",
		(status) => {
			expect(() =>
				Product.create(
					productFake.id,
					productFake.code,
					productFake.destinationUrl,
					productFake.marketplace,
					productFake.imageUrl,
					status,
				),
			).toThrow(new DomainError("Invalid product status"));
		},
	);
});
