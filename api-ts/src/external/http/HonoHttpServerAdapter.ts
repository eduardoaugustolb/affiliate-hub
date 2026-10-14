import { type Context, Hono } from "hono";
import type { StatusCode } from "hono/utils/http-status";
import { ErrorMapper } from "@/infra/ErrorMapper";
import type {
	HttpRestRuntime,
	RunningHttpServer,
} from "@/infra/http/HttpRestRuntime";
import {
	type HttpMethod,
	type HttpRestRequest,
	type HttpRestResponse,
	type HttpRestServer,
	HttpStatusCode,
} from "@/infra/http/HttpRestServer";

export class HonoHttpServerAdapter implements HttpRestServer {
	private app: Hono;
	private server: RunningHttpServer | undefined;

	constructor(private readonly runtime: HttpRestRuntime) {
		this.app = new Hono();
	}

	register(
		method: HttpMethod,
		path: string,
		handler: (
			req: HttpRestRequest,
			res: HttpRestResponse,
		) => Promise<HttpRestResponse>,
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
			const req: HttpRestRequest = {
				body,
				params,
				query,
				headers,
			};

			const res: HttpRestResponse = {
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
