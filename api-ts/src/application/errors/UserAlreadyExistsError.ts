export class UserAlreadyExistsError extends Error {
	readonly code = "USER_ALREADY_EXISTS";

	constructor() {
		super("User already exists");
		this.name = "UserAlreadyExistsError";
	}
}
