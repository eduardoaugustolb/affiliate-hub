import { DomainError } from "../errors/DomainError";

export class ProductCode {
	private readonly code: string;
	// Stored codes issued before the MVP rules may contain 1; keep old posts working.
	constructor(code: string, legacy = false) {
		this.code = code.trim().toUpperCase();
		const pattern = legacy ? /^[A-HJ-NP-Z1-9]{4,6}$/ : /^[A-HJ-NP-Z2-9]{4,6}$/;
		if (!pattern.test(this.code)) throw new DomainError("Invalid product code");
	}
	getValue(): string {
		return this.code;
	}
}
