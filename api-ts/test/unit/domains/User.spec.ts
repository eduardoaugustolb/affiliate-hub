import { describe, expect, it } from "bun:test";
import { User } from "@/domain/entities/User";
import { DomainError } from "@/domain/errors/DomainError";

describe("User entity", () => {
	it("should create a user with valid data", () => {
		const user = User.create(
			"name",
			"example@example.com",
			"password-hash",
			"admin",
		);
		expect(user).toBeInstanceOf(User);
		expect(user.getName()).toBe("name");
		expect(user.getEmail()).toBe("example@example.com");
		expect(user.getRole()).toEqual("admin");
		expect(user.getPasswordHash()).toBe("password-hash");
	});

	it("should rehydrate a user from a database record", () => {
		const user = User.rehydrate(
			"id",
			"name",
			"example@example.com",
			"password-hash",
			"admin",
		);
		expect(user).toBeInstanceOf(User);
		expect(user.getId()).toBe("id");
		expect(user.getName()).toBe("name");
		expect(user.getEmail()).toBe("example@example.com");
		expect(user.getRole()).toEqual("admin");
		expect(user.getPasswordHash()).toBe("password-hash");
	});

	it("should reject user rehydration with invalid id", () => {
		expect(() =>
			User.rehydrate(
				"",
				"name",
				"example@example.com",
				"password-hash",
				"admin",
			),
		).toThrow(new DomainError("Id is required"));
	});

	it.each(["invalid-email", "@example.com", "@", "example.com", "123", ""])(
		"should reject user rehydration with invalid email",
		(email) => {
			expect(() =>
				User.rehydrate("id", "name", email, "password-hash", "admin"),
			).toThrow(new DomainError("Invalid email"));
		},
	);

	it.each(["invalid-email", "@example.com", "@", "example.com", "123", ""])(
		"should reject user creation with invalid email",
		(email) => {
			expect(() =>
				User.create("name", email, "password-hash", "admin"),
			).toThrow(new DomainError("Invalid email"));
		},
	);

	it.each(["invalid-role", "123", "@", ""])(
		"should reject user creation with invalid role",
		(role) => {
			expect(() =>
				User.create("name", "example@example.com", "password-hash", role),
			).toThrow(new DomainError("Invalid user role"));
		},
	);

	it.each(["invalid-role", "123", "@", ""])(
		"should reject user rehydration with invalid role",
		(role) => {
			expect(() =>
				User.rehydrate(
					"id",
					"name",
					"example@example.com",
					"password-hash",
					role,
				),
			).toThrow(new DomainError("Invalid user role"));
		},
	);
});
