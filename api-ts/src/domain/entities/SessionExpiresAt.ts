import type { DateProvider } from "@/infra/date/Provider";
import { DomainError } from "../errors/DomainError";

export class SessionExpiresAt {
	private _value: Date;

	constructor(value: Date, dateProvider: DateProvider) {
		if (SessionExpiresAt.validate(value, dateProvider)) {
			throw new DomainError("Session expires at must be in the future");
		}
		this._value = value;
	}

	getValue(): Date {
		return this._value;
	}

	private static validate(value: Date, dateProvider: DateProvider): boolean {
		const now = dateProvider.now();
		return value < now;
	}
}
