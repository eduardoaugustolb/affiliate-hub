export class Timestamp {
	private _value: Date;

	constructor(value: Date) {
		this._value = value;
	}

	getValue(): Date {
		return this._value;
	}

	toString(): string {
		return this._value.toISOString();
	}

	static now(): Timestamp {
		return new Timestamp(new Date());
	}
}
