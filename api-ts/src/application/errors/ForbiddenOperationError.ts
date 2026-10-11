export class ForbiddenOperationError extends Error {
	readonly code = "FORBIDDEN_OPERATION";

	constructor(message = "User is not allowed to perform this operation") {
		super(message);
		this.name = "ForbiddenOperationError";
	}
}
