import type { CatalogCache } from "./CatalogCache";
import type { CatalogRepository } from "./CatalogRepository";
import { BadRequestError } from "./errors/BadRequestError";
import { ForbiddenOperationError } from "./errors/ForbiddenOperationError";
import type {
	SessionActor,
	SessionAuthenticator,
} from "./SessionAuthenticator";
export class CatalogService {
	constructor(
		private readonly repository: CatalogRepository,
		private readonly authenticator: SessionAuthenticator,
		private readonly cache?: CatalogCache,
	) {}
	private async authorize(actor: SessionActor) {
		if ((await this.authenticator.authenticate(actor)).getRole() !== "admin")
			throw new ForbiddenOperationError("Only admins can manage catalog");
	}
	private name(value: unknown): string {
		if (typeof value !== "string" || !value.trim() || value.trim().length > 160)
			throw new BadRequestError("Name must contain 1 to 160 characters");
		return value.trim();
	}
	private values(value: unknown, allowEmpty = false): string[] {
		if (
			!Array.isArray(value) ||
			value.length > 100 ||
			(!allowEmpty && !value.length) ||
			value.some((v) => typeof v !== "string" || !v.trim() || v.length > 100)
		)
			throw new BadRequestError("Expected up to 100 non-empty identifiers");
		return [...new Set(value.map((v) => v.trim()))];
	}
	async listCategories() {
		return this.cache
			? this.cache.read(() => this.repository.listCategories())
			: this.repository.listCategories();
	}
	async createOption(actor: SessionActor, categoryId: string, name: unknown) {
		await this.authorize(actor);
		if (categoryId !== "size" && categoryId !== "color")
			throw new BadRequestError(
				"Only size and color have configurable options",
			);
		const result = await this.repository.createOption(
			categoryId,
			this.name(name),
		);
		await this.cache?.invalidate();
		return result;
	}
	async removeOption(actor: SessionActor, id: string) {
		await this.authorize(actor);
		await this.repository.removeOption(id);
		await this.cache?.invalidate();
	}
	async getProductOptions(actor: SessionActor, code: string) {
		await this.authorize(actor);
		return {
			optionIds: await this.repository.getProductOptions(
				code.trim().toUpperCase(),
			),
		};
	}
	async setProductOptions(actor: SessionActor, code: string, ids: unknown) {
		await this.authorize(actor);
		await this.repository.setProductOptions(
			code.trim().toUpperCase(),
			this.values(ids, true),
		);
	}
	async createOutfit(actor: SessionActor, name: unknown, codes: unknown) {
		await this.authorize(actor);
		return this.repository.createOutfit(this.name(name), [
			...new Set(this.values(codes).map((c) => c.toUpperCase())),
		]);
	}
	async getOutfit(actor: SessionActor, code: string) {
		await this.authorize(actor);
		return this.repository.getOutfit(code.trim().toUpperCase());
	}
	async removeOutfit(actor: SessionActor, code: string) {
		await this.authorize(actor);
		await this.repository.removeOutfit(code.trim().toUpperCase());
	}
}
