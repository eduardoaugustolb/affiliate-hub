import type { ResolveProduct } from "@/application/usecases/queries/ResolveProduct";
import type { HttpRestResponseBuilder } from "@/infra/http/HttpRestResponseBuilder";
import {
	HttpMethod,
	type HttpRestServer,
	HttpStatusCode,
} from "@/infra/http/HttpRestServer";

export class ProductResolverRestController {
	constructor(server: HttpRestServer, resolver: ResolveProduct) {
		const resolve = async (code: string, res: HttpRestResponseBuilder) => {
			const { destinationUrl } = await resolver.execute(undefined, { code });
			return res
				.header("Cache-Control", "no-store")
				.header("Location", destinationUrl)
				.empty(HttpStatusCode.FOUND);
		};
		server.register(HttpMethod.GET, "/resolve", async (req, res) =>
			resolve(req.query.code ?? "", res),
		);
		// Register after the other controllers to preserve fixed API routes.
		server.register(HttpMethod.GET, "/:productCode", async (req, res) =>
			resolve(req.params.productCode ?? "", res),
		);
	}
}
