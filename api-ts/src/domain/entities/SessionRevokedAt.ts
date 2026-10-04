import type { DateProvider } from "@/infra/date/Provider";
import { DomainError } from "../errors/DomainError";

export class SessionRevokedAt {
	private _value: Date | null;

	constructor(value: Date | null, dateProvider: DateProvider) {
		if (!SessionRevokedAt.validate(value, dateProvider)) {
			throw new DomainError("Invalid SessionRevokedAt value");
		}
		this._value = value;
	}

	getValue(): Date | null {
		return this._value;
	}

	private static validate(
		value: Date | null,
		dateProvider: DateProvider,
	): boolean {
		return value ? dateProvider.now() >= value : true;
	}
}
