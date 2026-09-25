export class DomainError extends Error {
	code: "DOMAIN_ERROR";
	constructor(message: string) {
		super(message);
		this.name = "DomainError";
		this.code = "DOMAIN_ERROR";
	}
}
