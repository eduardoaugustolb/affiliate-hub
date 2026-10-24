import type { GetStorefrontEntry } from "@/application/usecases/queries/GetStorefrontEntry";
import { HttpMethod, type HttpRestServer } from "@/infra/http/HttpRestServer";

export class StorefrontRestController {
	constructor(server: HttpRestServer, entries: GetStorefrontEntry) {
		server.register(
			HttpMethod.GET,
			"/storefront/products/:code",
			async (req, res) =>
				res
					.header("Cache-Control", "no-store")
					.json(await entries.product(req.params.code ?? "")),
		);
		server.register(
			HttpMethod.GET,
			"/storefront/outfits/:code",
			async (req, res) =>
				res
					.header("Cache-Control", "no-store")
					.json(await entries.outfit(req.params.code ?? "")),
		);
	}
}
