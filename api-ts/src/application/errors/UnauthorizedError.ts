export class UnauthorizedError extends Error {
	code = "UNAUTHORIZED_ERROR";
	constructor(message: string) {
		super(message);
		this.name = "Unauthorized";
	}
}
