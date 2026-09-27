import { describe, expect, it } from "bun:test";
import { ProductStatus } from "@/domain/entities/ProductStatus";
import { DomainError } from "@/domain/errors/DomainError";

describe("ProductStatus entity", () => {
	it.each(["active", "inactive"])(
		"should create a valid ProductStatus",
		(status) => {
			const productStatus = new ProductStatus(status);
			expect(productStatus.getValue()).toBe(status);
		},
	);

	it("should throw an error for invalid status", () => {
		expect(() => new ProductStatus("invalid")).toThrow(
			new DomainError("Invalid product status"),
		);
	});
});
