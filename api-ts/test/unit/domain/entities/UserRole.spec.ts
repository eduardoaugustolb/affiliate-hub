import { describe, expect, it } from "bun:test";
import { UserRole } from "@/domain/entities/UserRole";
import { DomainError } from "@/domain/errors/DomainError";

describe("UserRole entity", () => {
	it("should create a UserRole", () => {
		const userRole = new UserRole("admin");
		expect(userRole).toBeInstanceOf(UserRole);
	});

	it.each(["invalid-role", "123", "@", ""])(
		"should reject invalid roles",
		(role) => {
			expect(() => new UserRole(role)).toThrow(
				new DomainError("Invalid user role"),
			);
		},
	);
});
