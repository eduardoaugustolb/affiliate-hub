import { DomainError } from "../errors/DomainError";
import { Email } from "./Email";
import { UserRole } from "./UserRole";

export class User {
	email: Email;
	role: UserRole;
	private constructor(
		private id: string,
		private name: string,
		email: string,
		private passwordHash: string,
		role: string,
	) {
		this.email = new Email(email);
		this.role = new UserRole(role);
	}

	static create(
		name: string,
		email: string,
		passwordHash: string,
		role: string,
	): User {
		return new User("", name, email, passwordHash, role);
	}

	static rehydrate(
		id: string,
		name: string,
		email: string,
		passwordHash: string,
		role: string,
	): User {
		if (!id.trim()) {
			throw new DomainError("Id is required");
		}
		return new User(id, name, email, passwordHash, role);
	}

	getId(): string {
		return this.id;
	}

	getName(): string {
		return this.name;
	}

	getEmail(): string {
		return this.email.getValue();
	}

	getRole(): string {
		return this.role.getValue();
	}

	getPasswordHash(): string {
		return this.passwordHash;
	}
}
