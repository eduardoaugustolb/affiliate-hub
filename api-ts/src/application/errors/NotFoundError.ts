export class NotFoundError extends Error {
	code = "NOT_FOUND_ERROR";
	constructor(message: string) {
		super(message);
		this.name = "NotFound";
	}
}
