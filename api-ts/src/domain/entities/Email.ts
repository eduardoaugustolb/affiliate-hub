import { DomainError } from "../errors/DomainError";

export class Email {
	constructor(private value: string) {
		if (!Email.isValid(value)) {
			throw new DomainError("Invalid email");
		}
	}

	getValue(): string {
		return this.value;
	}

	private static isValid(value: string): boolean {
		return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
	}
}
