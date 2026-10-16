import { ForbiddenOperationError } from "@/application/errors/ForbiddenOperationError";
import { InvalidCredentialsError } from "@/application/errors/InvalidCredentialsError";
import { ProductNotFoundError } from "@/application/errors/ProductNotFoundError";
import { ProductUnavailableError } from "@/application/errors/ProductUnavailableError";
import type { GetAuthenticatedUser } from "@/application/usecases/queries/GetAuthenticatedUser";
import type { ResolveProduct } from "@/application/usecases/queries/ResolveProduct";
import type { HttpRestResponseBuilder } from "@/infra/http/HttpRestResponseBuilder";
import {
	HttpMethod,
	type HttpRestServer,
	HttpStatusCode,
} from "@/infra/http/HttpRestServer";

export class WebController {
	constructor(
		server: HttpRestServer,
		resolver: ResolveProduct,
		authenticatedUser: GetAuthenticatedUser,
		cookieName: string,
	) {
		const file = (name: string) =>
			Bun.file(new URL(`../../../web/${name}`, import.meta.url)).text();
		const secure = (res: HttpRestResponseBuilder) =>
			res
				.header("Cache-Control", "no-store")
				.header("X-Content-Type-Options", "nosniff")
				.header("Referrer-Policy", "no-referrer")
				.header(
					"Content-Security-Policy",
					"default-src 'self'; img-src https: data:; style-src 'self'; script-src 'self'; connect-src 'self'; base-uri 'none'; frame-ancestors 'none'; form-action 'self'",
				);
		server.register(HttpMethod.GET, "/", async (_, res) =>
			secure(res).html((await file("home.html")).replace("<!--message-->", "")),
		);
		server.register(HttpMethod.GET, "/admin/login", async (_, res) =>
			secure(res).html(await file("login.html")),
		);
		server.register(HttpMethod.GET, "/admin", async (req, res) => {
			try {
				const user = await authenticatedUser.execute({
					sessionToken: req.cookies[cookieName] ?? "",
				});
				if (user.role !== "admin")
					throw new ForbiddenOperationError("Admin access required");
				return secure(res).html(await file("admin.html"));
			} catch (error) {
				if (error instanceof InvalidCredentialsError)
					return secure(res)
						.header("Location", "/admin/login")
						.empty(HttpStatusCode.SEE_OTHER);
				throw error;
			}
		});
		for (const [path, name, type] of [
			["/assets/app.css", "app.css", "text/css"],
			["/assets/admin.js", "admin.js", "text/javascript"],
			["/assets/login.js", "login.js", "text/javascript"],
		]) {
			if (!path || !name || !type) continue;
			server.register(HttpMethod.GET, path, async () => ({
				status: HttpStatusCode.OK,
				body: await file(name),
				headers: {
					"Content-Type": `${type}; charset=UTF-8`,
					"X-Content-Type-Options": "nosniff",
					"Cache-Control": "no-cache",
				},
			}));
		}
		const resolve = async (code: string, res: HttpRestResponseBuilder) => {
			try {
				const destination = await resolver.execute(undefined, { code });
				return secure(res)
					.header("Location", destination)
					.empty(HttpStatusCode.FOUND);
			} catch (error) {
				if (
					!(error instanceof ProductNotFoundError) &&
					!(error instanceof ProductUnavailableError)
				)
					throw error;
				const unavailable = error instanceof ProductUnavailableError;
				const message = unavailable
					? '<section class="notice" role="alert"><h2>Produto indisponível.</h2><p>Este produto não está disponível no momento. Tente outro código.</p></section>'
					: '<section class="notice" role="alert"><h2>Produto não encontrado.</h2><p>Confira o código no post e tente novamente.</p></section>';
				return secure(res)
					.status(unavailable ? HttpStatusCode.GONE : HttpStatusCode.NOT_FOUND)
					.html((await file("home.html")).replace("<!--message-->", message));
			}
		};
		server.register(HttpMethod.GET, "/resolve", async (req, res) =>
			resolve(req.query.code ?? "", res),
		);
		// Register after all fixed routes so /admin and /products are never product codes.
		server.register(HttpMethod.GET, "/:productCode", async (req, res) =>
			resolve(req.params.productCode ?? "", res),
		);
	}
}
