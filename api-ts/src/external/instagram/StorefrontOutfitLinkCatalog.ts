import { BadRequestError } from "@/application/errors/BadRequestError";
import type { OutfitLinkCatalog } from "@/application/instagram/InstagramPorts";
import type { GetStorefrontEntry } from "@/application/usecases/queries/GetStorefrontEntry";

export class StorefrontOutfitLinkCatalog implements OutfitLinkCatalog {
	private readonly base: URL;
	constructor(
		private readonly entries: GetStorefrontEntry,
		baseUrl: string,
	) {
		this.base = new URL(baseUrl);
		if (
			this.base.protocol !== "https:" ||
			this.base.username ||
			this.base.password ||
			this.base.pathname !== "/" ||
			this.base.search ||
			this.base.hash
		)
			throw new Error("STOREFRONT_BASE_URL must be an HTTPS origin");
	}
	async get(code: string) {
		const outfit = await this.entries.outfit(code);
		if (!outfit.products.length)
			throw new BadRequestError("Outfit has no available products");
		return {
			name: outfit.name,
			url: new URL(`/o/${encodeURIComponent(code)}`, this.base).href,
		};
	}
}
