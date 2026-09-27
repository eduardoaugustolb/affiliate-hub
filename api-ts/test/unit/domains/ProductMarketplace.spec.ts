import { describe, expect, it } from "bun:test";
import { ProductMarketplace } from "@/domain/entities/ProductMarketplace";
import { DomainError } from "@/domain/errors/DomainError";

describe("ProductMarketplace entity", () => {
	it.each(["shein", "shopee"])(
		"should create a valid ProductMarketplace",
		(marketplace) => {
			const instance = new ProductMarketplace(marketplace);
			expect(instance).toBeTruthy();
			expect(instance).toBeInstanceOf(ProductMarketplace);
		},
	);
	it.each(["invalid", "", "shein2", "shopee2"])(
		"should throw a DomainError for invalid marketplace",
		(marketplace) => {
			expect(() => new ProductMarketplace(marketplace)).toThrow(
				new DomainError("Invalid product marketplace"),
			);
		},
	);
});
