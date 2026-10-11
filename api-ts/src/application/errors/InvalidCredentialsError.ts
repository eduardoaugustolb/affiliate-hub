export class InvalidCredentialsError extends Error {
	readonly code = "INVALID_CREDENTIALS";

	constructor(message = "Email or password is invalid") {
		super(message);
		this.name = "InvalidCredentialsError";
	}
}
