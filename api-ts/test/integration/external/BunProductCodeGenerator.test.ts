import { describe, expect, it } from "bun:test";
import { BunProductCodeGenerator } from "@/external/BunProductCodeGenerator";

describe("BunProductCodeGenerator", () => {
	it("generates six-character codes without ambiguous characters", () => {
		const generator = new BunProductCodeGenerator();
		for (let i = 0; i < 100; i++)
			expect(generator.generate()).toMatch(/^[A-HJ-NP-Z2-9]{6}$/);
	});
});
