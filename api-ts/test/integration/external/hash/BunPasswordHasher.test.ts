import { describe, expect, it } from "bun:test";
import { BunPasswordHasher } from "@/external/hash/BunPasswordHasher";

describe("BunPasswordHasher", () => {
	it("hashes and verifies passwords without storing plaintext", async () => {
		const hasher = new BunPasswordHasher();
		const hash = await hasher.hash("correct horse battery staple");
		expect(hash).not.toBe("correct horse battery staple");
		expect(await hasher.verify("correct horse battery staple", hash)).toBe(
			true,
		);
		expect(await hasher.verify("wrong", hash)).toBe(false);
	});
});
