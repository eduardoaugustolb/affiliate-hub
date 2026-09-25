import { DomainError } from "../errors/DomainError";

export class ProductCode {
	constructor(private readonly code: string) {
		if (!ProductCode.validate(code)) {
			throw new DomainError("Invalid code");
		}
	}

	getValue(): string {
		return this.code;
	}

	private static validate(code: string): boolean {
		const trimmedCode = code.trim();
		const codeRegex = /^[A-HJ-NP-Z1-9]+$/;

		return codeRegex.test(trimmedCode);
	}
}
