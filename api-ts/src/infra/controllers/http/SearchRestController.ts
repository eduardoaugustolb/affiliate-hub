import { BadRequestError } from "@/application/errors/BadRequestError";
import type { ListSearchFilters } from "@/application/usecases/queries/ListSearchFilters";
import type { SearchProducts } from "@/application/usecases/queries/SearchProducts";
import { HttpMethod, type HttpRestServer } from "@/infra/http/HttpRestServer";

export class SearchRestController {
	constructor(
		server: HttpRestServer,
		search: SearchProducts,
		filters: ListSearchFilters,
	) {
		server.register(HttpMethod.GET, "/search/filters", async (_req, res) =>
			res.header("Cache-Control", "no-store").json(await filters.execute()),
		);
		server.register(HttpMethod.GET, "/search", async (req, res) => {
			const allowed = [
				"limit",
				"offset",
				"productCode",
				"outfitCode",
				"name",
				"marketplace",
				"size",
				"color",
			];
			if (Object.keys(req.query).some((key) => !allowed.includes(key)))
				throw new BadRequestError("Unknown search filter");
			const { query } = req;
			return res.header("Cache-Control", "no-store").json(
				await search.execute({
					limit: Number(query.limit ?? 25),
					offset: Number(query.offset ?? 0),
					productCode: query.productCode,
					outfitCode: query.outfitCode,
					name: query.name,
					marketplace: query.marketplace,
					size: query.size?.split(","),
					color: query.color?.split(","),
				}),
			);
		});
	}
}
