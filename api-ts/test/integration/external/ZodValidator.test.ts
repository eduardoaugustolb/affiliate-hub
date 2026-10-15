import { describe, expect, it } from "bun:test";
import { environmentVarsSchema, ZodValidator } from "@/external/ZodValidator";

describe("ZodValidator", () => {
	const validator = new ZodValidator(environmentVarsSchema);
	it("accepts a database URL", () =>
		expect(
			validator.validate({ DATABASE_URL: "postgres://localhost/db" }),
		).resolves.toBe(true));
	it("rejects missing or wrongly typed values", () => {
		expect(validator.validate({})).resolves.toBe(false);
		expect(validator.validate({ DATABASE_URL: 42 })).resolves.toBe(false);
	});
});
