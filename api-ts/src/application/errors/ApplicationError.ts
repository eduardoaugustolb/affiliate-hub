export class ApplicationError extends Error {
	code = "APPLICATION_ERROR";
	constructor(message: string) {
		super(message);
		this.name = "ApplicationError";
	}
}
