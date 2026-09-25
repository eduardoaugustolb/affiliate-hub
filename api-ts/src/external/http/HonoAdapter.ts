import { type Context, Hono } from "hono";
import type { StatusCode } from "hono/utils/http-status";
import { ErrorMapper } from "../../infra/ErrorMapper";
import type { HttpRuntime, RunningServer } from "../../infra/http/HttpRuntime";
import {
	type HttpMethod,
	type HttpRequest,
	type HttpResponse,
	type HttpServer,
	HttpStatusCode,
} from "../../infra/http/HttpServer";

export class HonoAdapter implements HttpServer {
	private app: Hono;
	private server: RunningServer | undefined;

	constructor(private readonly runtime: HttpRuntime) {
		this.app = new Hono();
	}

	register(
		method: HttpMethod,
		path: string,
		handler: (req: HttpRequest, res: HttpResponse) => Promise<HttpResponse>,
	): void {
		this.app.on(method, [path], async (ctx: Context) => {
			const rawBody = await ctx.req.text();
			let body: unknown;
			if (rawBody.length > 0) {
				body = JSON.parse(rawBody);
			}
			const params = ctx.req.param();
			const query = ctx.req.query();
			const headers = ctx.req.header();
			const req: HttpRequest = {
				body,
				params,
				query,
				headers,
			};

			const res: HttpResponse = {
				status: HttpStatusCode.OK,
				body: null,
				headers: {},
			};

			try {
				const result = await handler(req, res);
				ctx.status(result.status as StatusCode);
				switch (res.headers["Content-Type"]) {
					case "application/json":
						return ctx.json(result.body);
					case "text/plain":
						return ctx.text(JSON.stringify(result.body));
					default:
						return ctx.text(JSON.stringify(result.body));
				}
			} catch (error: unknown) {
				const result = await ErrorMapper.toRestResponse(error as Error);
				return ctx.text(JSON.stringify(result.body), result.status);
			}
		});
	}

	async close(): Promise<void> {
		if (this.server) {
			await this.server.stop();
		}
	}

	async listen(port: number): Promise<void> {
		this.server = await this.runtime.serve(this.app.fetch, {
			port,
		});
		console.log(`Server is listening with Hono on port ${port}`);
	}
}
