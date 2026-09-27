import { describe, expect, it } from "bun:test";
import { ProductCode } from "@/domain/entities/ProductCode";
import { DomainError } from "@/domain/errors/DomainError";

describe("ProductCode entity", () => {
	it.each(["I", "O", "0", ""])(
		"should throw an error when created with an invalid code",
		(code) => {
			expect(() => {
				new ProductCode(code);
			}).toThrow(new DomainError("Invalid product code"));
		},
	);

	it("should be created with a valid code", () => {
		const code = new ProductCode("A123");
		expect(code).toBeInstanceOf(ProductCode);
		expect(code.getValue()).toBe("A123");
	});
});
