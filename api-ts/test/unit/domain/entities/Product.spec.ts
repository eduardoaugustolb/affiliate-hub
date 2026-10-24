import { describe, expect, it } from "bun:test";
import { productFake } from "@test/support/fixtures/productFake";
import { Product } from "@/domain/entities/Product";
import { DomainError } from "@/domain/errors/DomainError";

describe("Product entity", () => {
	it("should create a product with valid data", () => {
		const product = Product.create(
			productFake.code,
			productFake.destinationUrl,
			productFake.marketplace,
			productFake.imageUrl,
			productFake.status,
		);

		expect(product).toBeTruthy();
		expect(product.getId()).toBe("");
		expect(product.getCode()).toBe(productFake.code);
		expect(product.getDestinationUrl()).toBe(productFake.destinationUrl);
		expect(product.getMarketplace()).toBe(productFake.marketplace);
		expect(product.getImageUrl()).toBe(productFake.imageUrl);
		expect(product.getStatus()).toBe(productFake.status);
	});

	it("should rehydrate a product with valid data", () => {
		const product = Product.rehydrate(
			productFake.id,
			productFake.code,
			productFake.destinationUrl,
			productFake.marketplace,
			productFake.imageUrl,
			productFake.status,
		);

		expect(product).toBeTruthy();
		expect(product.getId()).toBe(productFake.id);
		expect(product.getCode()).toBe(productFake.code);
		expect(product.getDestinationUrl()).toBe(productFake.destinationUrl);
		expect(product.getMarketplace()).toBe(productFake.marketplace);
		expect(product.getImageUrl()).toBe(productFake.imageUrl);
		expect(product.getStatus()).toBe(productFake.status);
	});

	it.each(["I", "O", "0", ""])(
		"should reject product rehydration with an invalid code",
		(code) => {
			expect(() =>
				Product.rehydrate(
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
		"should reject product rehydration with an invalid destination url",
		(destinationUrl) => {
			expect(() =>
				Product.rehydrate(
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
		"should reject product rehydration with an invalid image url",
		(imageUrl) => {
			expect(() =>
				Product.rehydrate(
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
		"should reject product rehydration with an invalid marketplace",
		(marketplace) => {
			expect(() =>
				Product.rehydrate(
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
		"should reject product rehydration with an invalid status",
		(status) => {
			expect(() =>
				Product.rehydrate(
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

	it.each(["I", "O", "0", ""])(
		"should reject product creation with an invalid code",
		(code) => {
			expect(() =>
				Product.create(
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

describe("Product administrative name", () => {
	it("trims the administrative name", () => {
		const product = Product.create(
			"A7K2",
			productFake.destinationUrl,
			productFake.marketplace,
			productFake.imageUrl,
			productFake.status,
			"  Camiseta preta  ",
		);
		expect(product.getName()).toBe("Camiseta preta");
	});
	it.each(["", "  ", "a".repeat(161)])("rejects invalid names: %j", (name) => {
		expect(() =>
			Product.create(
				"A7K2",
				productFake.destinationUrl,
				productFake.marketplace,
				productFake.imageUrl,
				productFake.status,
				name,
			),
		).toThrow(DomainError);
	});
});

describe("Product gallery", () => {
	const create = (urls?: string[]) =>
		Product.create(
			productFake.code,
			productFake.destinationUrl,
			productFake.marketplace,
			productFake.imageUrl,
			productFake.status,
			"Produto",
			urls,
		);
	it("supports legacy single images", () => {
		expect(create().getImageUrls()).toEqual([productFake.imageUrl]);
	});
	it("keeps ordered unique images and uses the first as cover", () => {
		const urls: [string, string] = [
			"https://example.com/red.jpg",
			"https://example.com/blue.jpg",
		];
		const product = create([...urls, urls[0]]);
		expect(product.getImageUrls()).toEqual(urls);
		expect(product.getImageUrl()).toBe(urls[0]);
		product.getImageUrls().pop();
		expect(product.getImageUrls()).toEqual(urls);
	});
	it.each(
		[
			[],
			["http://example.com/a.jpg"],
			Array(21).fill("https://example.com/a.jpg"),
			[null],
			"invalid",
		].map((urls) => [urls]),
	)("rejects malformed galleries %j", (urls) => {
		expect(() => create(urls as string[])).toThrow(DomainError);
	});
});
