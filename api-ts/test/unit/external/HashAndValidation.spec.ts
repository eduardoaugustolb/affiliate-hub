import { describe, expect, it } from "bun:test";
import { BunPasswordHasher } from "@/external/hash/BunPasswordHasher";
import { BunSessionTokenHasher } from "@/external/hash/BunSessionTokenHasher";
import {
	EnvironmentVarsValidator,
	environmentVarsSchema,
} from "@/external/validation/environment/ZodEnvironmentVarsValidator";

describe("hash adapters", () => {
	it("hashes and verifies passwords without storing plaintext", async () => {
		const hasher = new BunPasswordHasher();
		const hash = await hasher.hash("correct horse battery staple");
		expect(hash).not.toBe("correct horse battery staple");
		expect(await hasher.verify("correct horse battery staple", hash)).toBe(
			true,
		);
		expect(await hasher.verify("wrong", hash)).toBe(false);
	});
	it("returns a deterministic SHA-256 hex digest for session tokens", async () => {
		const hasher = new BunSessionTokenHasher();
		const digest = await hasher.hash("session-token");
		expect(digest).toBe(Bun.SHA256.hash("session-token", "hex"));
		expect(digest).toMatch(/^[a-f0-9]{64}$/);
		expect(digest).not.toContain("session-token");
	});
});

describe("EnvironmentVarsValidator", () => {
	const validator = new EnvironmentVarsValidator(environmentVarsSchema);
	it("accepts a database URL", () =>
		expect(
			validator.validate({ DATABASE_URL: "postgres://localhost/db" }),
		).resolves.toBe(true));
	it("rejects missing or wrongly typed values", () => {
		expect(validator.validate({})).resolves.toBe(false);
		expect(validator.validate({ DATABASE_URL: 42 })).resolves.toBe(false);
	});
});
