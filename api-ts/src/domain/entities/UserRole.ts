import { DomainError } from "../errors/DomainError";

export class UserRole {
	constructor(private value: string) {
		if (!UserRole.isValid(value)) {
			throw new DomainError("Invalid user role");
		}
	}

	private static isValid(value: string): boolean {
		return UserRole.roles.includes(
			value.trim() as (typeof UserRole.roles)[number],
		);
	}

	getValue(): string {
		return this.value;
	}

	private static roles = ["admin"] as const;
}
