import { describe, expect, it } from "bun:test";
import { BunTokenGenerator } from "@/external/BunTokenGenerator";

describe("BunTokenGenerator", () => {
	it("generates URL-safe random tokens with the requested byte length", () => {
		const generator = new BunTokenGenerator();
		const token = generator.generate(32);
		expect(token).toMatch(/^[A-Za-z0-9_-]+$/);
		expect(Buffer.from(token, "base64url")).toHaveLength(32);
		expect(generator.generate(32)).not.toBe(token);
	});
});
