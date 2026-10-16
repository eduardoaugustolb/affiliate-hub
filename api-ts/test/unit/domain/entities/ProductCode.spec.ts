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
		const code = new ProductCode("A234");
		expect(code).toBeInstanceOf(ProductCode);
		expect(code.getValue()).toBe("A234");
	});
});

describe("ProductCode MVP rules", () => {
	it.each(["a7k2", " A7k2 "])("normalizes %s", (code) =>
		expect(new ProductCode(code).getValue()).toBe("A7K2"),
	);
	it.each([
		"A",
		"ABC",
		"AAAAAAA",
		"A1BC",
		"AB0C",
		"ABOC",
		"ABIC",
		"https://example.com",
	])("rejects invalid code %s", (code) =>
		expect(() => new ProductCode(code)).toThrow(DomainError),
	);
	it("preserves previously issued codes containing 1 when rehydrating", () =>
		expect(new ProductCode("ab1234", true).getValue()).toBe("AB1234"));
});
