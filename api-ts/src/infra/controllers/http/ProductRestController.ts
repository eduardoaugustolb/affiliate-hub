import { BadRequestError } from "@/application/errors/BadRequestError";
import { InvalidCredentialsError } from "@/application/errors/InvalidCredentialsError";
import { ProductNotFoundError } from "@/application/errors/ProductNotFoundError";
import type { CreateProduct } from "@/application/usecases/commands/CreateProduct";
import type { DeleteProduct } from "@/application/usecases/commands/DeleteProduct";
import type { UpdateProduct } from "@/application/usecases/commands/UpdateProduct";
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
		updateProduct: UpdateProduct,
		deleteProduct: DeleteProduct,
	) {
		httpServer.register(HttpMethod.POST, "/products", async (req, res) => {
			const sessionToken = req.cookies[sessionCookieName];
			if (!sessionToken) throw new InvalidCredentialsError();
			const { destinationUrl, marketplace, imageUrl, status } =
				parseProductInput(req.body);
			await createProduct.execute(
				{ sessionToken },
				{ destinationUrl, marketplace, imageUrl, status },
			);
			return res.empty(HttpStatusCode.CREATED);
		});
		httpServer.register(HttpMethod.PUT, "/products/:code", async (req, res) => {
			const sessionToken = req.cookies[sessionCookieName];
			if (!sessionToken) throw new InvalidCredentialsError();
			const input = parseProductInput(req.body);
			await updateProduct.execute(
				{ sessionToken },
				{ ...input, code: req.params.code ?? "" },
			);
			return res.empty(HttpStatusCode.NO_CONTENT);
		});
		httpServer.register(
			HttpMethod.DELETE,
			"/products/:code",
			async (req, res) => {
				const sessionToken = req.cookies[sessionCookieName];
				if (!sessionToken) throw new InvalidCredentialsError();
				await deleteProduct.execute(
					{ sessionToken },
					{ code: req.params.code ?? "" },
				);
				return res.empty(HttpStatusCode.NO_CONTENT);
			},
		);

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

function parseProductInput(body: unknown) {
	if (!body || typeof body !== "object" || Array.isArray(body))
		throw new BadRequestError("Invalid product payload");
	const { destinationUrl, marketplace, imageUrl, status } = body as Record<
		string,
		unknown
	>;
	if (
		typeof destinationUrl !== "string" ||
		typeof marketplace !== "string" ||
		typeof imageUrl !== "string" ||
		typeof status !== "string"
	)
		throw new BadRequestError("Product fields must be strings");
	return { destinationUrl, marketplace, imageUrl, status };
}
