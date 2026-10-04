import { describe, expect, it } from "bun:test";
import { Email } from "@/domain/entities/Email";
import { DomainError } from "@/domain/errors/DomainError";

describe("Email entity", () => {
	it("should create an Email", () => {
		const email = new Email("test@example.com");
		expect(email).toBeInstanceOf(Email);
	});

	it.each(["example.com", "invalid-email", "@", "invalid.com@", "123", ""])(
		"should reject invalid email",
		(email) => {
			expect(() => new Email(email)).toThrow(new DomainError(`Invalid email`));
		},
	);
});
