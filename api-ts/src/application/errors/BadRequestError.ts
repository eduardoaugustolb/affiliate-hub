export class BadRequestError extends Error {
	readonly code = "BAD_REQUEST";

	constructor(message = "Bad request") {
		super(message);
		this.name = "BadRequestError";
	}
}
