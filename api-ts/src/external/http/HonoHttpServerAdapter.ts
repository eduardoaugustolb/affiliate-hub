import { type Context, Hono } from "hono";
import { generateCookie, getCookie } from "hono/cookie";
import { BadRequestError } from "@/application/errors/BadRequestError";
import { ErrorMapper } from "@/infra/ErrorMapper";
import { HttpRestResponseBuilder } from "@/infra/http/HttpRestResponseBuilder";
import type {
	HttpRestRuntime,
	RunningRestServer,
} from "@/infra/http/HttpRestRuntime";
import type {
	HttpMethod,
	HttpRestRequest,
	HttpRestResponse,
	HttpRestServer,
} from "@/infra/http/HttpRestServer";

export class HonoHttpServerAdapter implements HttpRestServer {
	private app: Hono;
	private server: RunningRestServer | undefined;

	constructor(private readonly runtime: HttpRestRuntime) {
		this.app = new Hono();
	}

	register(
		method: HttpMethod,
		path: string,
		handler: (
			req: HttpRestRequest,
			res: HttpRestResponseBuilder,
		) => Promise<HttpRestResponse>,
		options?: { parseJson?: boolean },
	): void {
		this.app.on(method, [path], async (ctx: Context) => {
			try {
				const rawBody = new Uint8Array(await ctx.req.arrayBuffer());
				let body: unknown;
				if (options?.parseJson !== false && rawBody.length > 0) {
					try {
						body = JSON.parse(new TextDecoder().decode(rawBody));
					} catch {
						throw new BadRequestError("Invalid JSON payload");
					}
				}
				const params = ctx.req.param();
				const query = ctx.req.query();
				const headers = ctx.req.header();
				const req: HttpRestRequest = {
					rawBody,
					cookies: getCookie(ctx),
					body,
					params,
					query,
					headers,
				};

				const res = new HttpRestResponseBuilder();

				const result = await handler(req, res);
				return this.respond(result);
			} catch (error: unknown) {
				const result = await ErrorMapper.toRestResponse(error as Error);
				return this.respond(result);
			}
		});
	}

	private respond(result: HttpRestResponse): Response {
		// Validate all cookies before emitting any response headers.
		const cookies = (result.cookies ?? []).map(({ name, value, ...options }) =>
			generateCookie(name, value, options),
		);
		const headers = new Headers(result.headers);
		for (const cookie of cookies) headers.append("Set-Cookie", cookie);
		if (result.status === 204) {
			return new Response(null, { status: result.status, headers });
		}
		const contentType = headers
			.get("Content-Type")
			?.split(";")[0]
			?.trim()
			.toLowerCase();
		const isJson =
			contentType === "application/json" || contentType?.endsWith("+json");
		const body =
			isJson || typeof result.body !== "string"
				? JSON.stringify(result.body)
				: result.body;
		return new Response(body, { status: result.status, headers });
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
