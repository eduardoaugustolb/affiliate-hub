import type { CatalogService } from "@/application/CatalogService";
import { BadRequestError } from "@/application/errors/BadRequestError";
import { InvalidCredentialsError } from "@/application/errors/InvalidCredentialsError";
import {
	HttpMethod,
	type HttpRestRequest,
	type HttpRestServer,
	HttpStatusCode,
} from "@/infra/http/HttpRestServer";
export class CatalogRestController {
	constructor(
		server: HttpRestServer,
		service: CatalogService,
		cookieName: string,
	) {
		const actor = (req: HttpRestRequest) => {
			const sessionToken = req.cookies[cookieName];
			if (!sessionToken) throw new InvalidCredentialsError();
			return { sessionToken };
		};
		const body = (req: HttpRestRequest): Record<string, unknown> => {
			if (!req.body || typeof req.body !== "object" || Array.isArray(req.body))
				throw new BadRequestError("Expected an object payload");
			return req.body as Record<string, unknown>;
		};
		server.register(
			HttpMethod.POST,
			"/filter-categories/:id/options",
			async (req, res) =>
				res
					.status(HttpStatusCode.CREATED)
					.json(
						await service.createOption(
							actor(req),
							req.params.id ?? "",
							body(req).name,
						),
					),
		);
		server.register(
			HttpMethod.DELETE,
			"/filter-options/:id",
			async (req, res) => {
				await service.removeOption(actor(req), req.params.id ?? "");
				return res.empty(HttpStatusCode.NO_CONTENT);
			},
		);
		server.register(
			HttpMethod.GET,
			"/products/:code/filter-options",
			async (req, res) =>
				res
					.header("Cache-Control", "no-store")
					.json(
						await service.getProductOptions(actor(req), req.params.code ?? ""),
					),
		);
		server.register(
			HttpMethod.PUT,
			"/products/:code/filter-options",
			async (req, res) => {
				await service.setProductOptions(
					actor(req),
					req.params.code ?? "",
					body(req).optionIds,
				);
				return res.empty(HttpStatusCode.NO_CONTENT);
			},
		);
		server.register(HttpMethod.POST, "/outfits", async (req, res) => {
			const input = body(req);
			return res
				.status(HttpStatusCode.CREATED)
				.json(
					await service.createOutfit(
						actor(req),
						input.name,
						input.productCodes,
					),
				);
		});
		server.register(HttpMethod.GET, "/outfits/:code", async (req, res) =>
			res
				.header("Cache-Control", "no-store")
				.json(await service.getOutfit(actor(req), req.params.code ?? "")),
		);
		server.register(HttpMethod.DELETE, "/outfits/:code", async (req, res) => {
			await service.removeOutfit(actor(req), req.params.code ?? "");
			return res.empty(HttpStatusCode.NO_CONTENT);
		});
	}
}
