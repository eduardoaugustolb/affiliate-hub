import { BadRequestError } from "@/application/errors/BadRequestError";
import { InvalidCredentialsError } from "@/application/errors/InvalidCredentialsError";
import { ProductNotFoundError } from "@/application/errors/ProductNotFoundError";
import type { CreateProduct } from "@/application/usecases/commands/CreateProduct";
import type { GetProductByCode } from "@/application/usecases/queries/GetProductByCode";
import {
	HttpMethod,
	type HttpRestServer,
	HttpStatusCode,
} from "@/infra/http/HttpRestServer";
export class ProductRestController {
	constructor(
		httpServer: HttpRestServer,
		createProduct: CreateProduct,
		getProductByCode: GetProductByCode,
		sessionCookieName: string,
	) {
		httpServer.register(HttpMethod.POST, "/products", async (req, res) => {
			const sessionToken = req.cookies[sessionCookieName];
			if (!sessionToken) throw new InvalidCredentialsError();
			if (!req.body || typeof req.body !== "object" || Array.isArray(req.body))
				throw new BadRequestError("Invalid product payload");
			const { destinationUrl, marketplace, imageUrl, status } =
				req.body as Record<string, unknown>;
			if (
				typeof destinationUrl !== "string" ||
				typeof marketplace !== "string" ||
				typeof imageUrl !== "string" ||
				typeof status !== "string"
			)
				throw new BadRequestError("Product fields must be strings");
			await createProduct.execute(
				{ sessionToken },
				{ destinationUrl, marketplace, imageUrl, status },
			);
			return res.empty(HttpStatusCode.CREATED);
		});
		httpServer.register(HttpMethod.GET, "/products/:code", async (req, res) => {
			const code = req.params.code;
			if (!code?.trim()) throw new ProductNotFoundError(code ?? "");

			const product = await getProductByCode.execute(undefined, {
				code,
			});
			return res.json({
				id: product.getId(),
				code: product.getCode(),
				destinationUrl: product.getDestinationUrl(),
				marketplace: product.getMarketplace(),
				imageUrl: product.getImageUrl(),
				status: product.getStatus(),
			});
		});
	}
}
