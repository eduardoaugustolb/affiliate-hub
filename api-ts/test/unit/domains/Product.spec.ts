import { describe, expect, it } from "bun:test";
import { Product } from "@/domain/entities/Product";
import { DomainError } from "@/domain/errors/DomainError";

const productMock = {
	id: "id",
	code: "ABC123",
	destinationUrl: "https://example.com",
	marketplace: "shein",
	imageUrl: "https://example.com/image.jpg",
	status: "active",
};

describe("Product entity", () => {
	it("should create a product with valid data", () => {
		const product = Product.create(
			productMock.id,
			productMock.code,
			productMock.destinationUrl,
			productMock.marketplace,
			productMock.imageUrl,
			productMock.status,
		);

		expect(product).toBeTruthy();
		expect(product.getId()).toBe(productMock.id);
		expect(product.getCode().getValue()).toBe(productMock.code);
		expect(product.getDestinationUrl().getValue()).toBe(
			productMock.destinationUrl,
		);
		expect(product.getMarketplace().getValue()).toBe(productMock.marketplace);
		expect(product.getImageUrl().getUrl()).toBe(productMock.imageUrl);
		expect(product.getStatus().getValue()).toBe(productMock.status);
	});
	it.each(["I", "O", "0", ""])(
		"should reject product creation with an invalid code",
		(code) => {
			expect(() =>
				Product.create(
					productMock.id,
					code,
					productMock.destinationUrl,
					productMock.marketplace,
					productMock.imageUrl,
					productMock.status,
				),
			).toThrow(new DomainError("Invalid product code"));
		},
	);

	it.each(["http://example.com", "example", "example.com", ""])(
		"should reject product creation with an invalid destination url",
		(destinationUrl) => {
			expect(() =>
				Product.create(
					productMock.id,
					productMock.code,
					destinationUrl,
					productMock.marketplace,
					productMock.imageUrl,
					productMock.status,
				),
			).toThrow(new DomainError("Invalid product destination URL"));
		},
	);

	it.each(["http://example.com", "example", "example.com", ""])(
		"should reject product creation with an invalid image url",
		(imageUrl) => {
			expect(() =>
				Product.create(
					productMock.id,
					productMock.code,
					productMock.destinationUrl,
					productMock.marketplace,
					imageUrl,
					productMock.status,
				),
			).toThrow(new DomainError("Invalid product image URL"));
		},
	);

	it.each(["", "invalid-marketplace"])(
		"should reject product creation with an invalid marketplace",
		(marketplace) => {
			expect(() =>
				Product.create(
					productMock.id,
					productMock.code,
					productMock.destinationUrl,
					marketplace,
					productMock.imageUrl,
					productMock.status,
				),
			).toThrow(new DomainError("Invalid product marketplace"));
		},
	);

	it.each(["", "invalid-status"])(
		"should reject product creation with an invalid status",
		(status) => {
			expect(() =>
				Product.create(
					productMock.id,
					productMock.code,
					productMock.destinationUrl,
					productMock.marketplace,
					productMock.imageUrl,
					status,
				),
			).toThrow(new DomainError("Invalid product status"));
		},
	);
});
