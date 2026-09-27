import { DomainError } from "../errors/DomainError";

export class ProductStatus {
	private readonly status: string;

	constructor(status: string) {
		if (!ProductStatus.validate(status)) {
			throw new DomainError("Invalid product status");
		}
		this.status = status;
	}

	getValue(): string {
		return this.status;
	}

	private static validate(status: string): boolean {
		const trimmed = status.trim();
		const allowedStatuses = ["active", "inactive"];
		return allowedStatuses.includes(trimmed);
	}
}
