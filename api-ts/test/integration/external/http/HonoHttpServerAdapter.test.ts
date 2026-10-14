import { describe, expect, it } from "bun:test";
import { InvalidCredentialsError } from "@/application/errors/InvalidCredentialsError";
import { ProductNotFoundError } from "@/application/errors/ProductNotFoundError";
import { UserAlreadyExistsError } from "@/application/errors/UserAlreadyExistsError";
import { HonoHttpServerAdapter } from "@/external/http/HonoHttpServerAdapter";
import type {
	FetchHandler,
	HttpRestRuntime,
	RunningHttpServer,
} from "@/infra/http/HttpRestRuntime";
import { HttpMethod, HttpStatusCode } from "@/infra/http/HttpRestServer";

class CapturingRuntime implements HttpRestRuntime {
	handler?: FetchHandler;
	options?: { port: number; hostname?: string };
	stopped = false;
	async serve(
		handler: FetchHandler,
		options: { port: number; hostname?: string },
	): Promise<RunningHttpServer> {
		this.handler = handler;
		this.options = options;
		return {
			port: options.port,
			stop: async () => {
				this.stopped = true;
			},
		};
	}
}

describe("HonoHttpServerAdapter", () => {
	it("maps incoming request data to the handler and returns JSON response", async () => {
		const runtime = new CapturingRuntime();
		const server = new HonoHttpServerAdapter(runtime);
		server.register(HttpMethod.POST, "/products/:id", async (req) => ({
			status: HttpStatusCode.OK,
			body: {
				id: req.params.id,
				q: req.query.q,
				name: (req.body as { name: string }).name,
				agent: req.headers["user-agent"],
			},
			headers: { "Content-Type": "application/json" },
		}));
		await server.listen(8123);
		const response = await runtime.handler?.(
			new Request("http://localhost/products/p-1?q=abc", {
				method: "POST",
				headers: { "content-type": "application/json", "user-agent": "test" },
				body: JSON.stringify({ name: "Item" }),
			}),
		);
		expect(response?.status).toBe(200);
		expect(await response?.json()).toEqual({
			id: "p-1",
			q: "abc",
			name: "Item",
			agent: "test",
		});
		expect(runtime.options).toEqual({ port: 8123 });
		await server.close();
		expect(runtime.stopped).toBe(true);
	});

	it("maps application errors into HTTP responses", async () => {
		const runtime = new CapturingRuntime();
		const server = new HonoHttpServerAdapter(runtime);
		server.register(HttpMethod.GET, "/private", async () => {
			throw new Error("failure");
		});

		await server.listen(8124);
		const response = await runtime.handler?.(
			new Request("http://localhost/private"),
		);
		expect(response?.status).toBe(500);
		expect(await response?.json()).toEqual({
			message: "failure",
			code: "INTERNAL_SERVER_ERROR",
		});
	});

	it("maps duplicate users to HTTP 409", async () => {
		const runtime = new CapturingRuntime();
		const server = new HonoHttpServerAdapter(runtime);
		server.register(HttpMethod.POST, "/users", async () => {
			throw new UserAlreadyExistsError();
		});
		await server.listen(8126);
		const response = await runtime.handler?.(
			new Request("http://localhost/users", { method: "POST" }),
		);
		expect(response?.status).toBe(409);
		expect(await response?.json()).toEqual({
			message: "User already exists",
			code: "USER_ALREADY_EXISTS",
		});
	});

	it("maps invalid credentials to HTTP 401", async () => {
		const runtime = new CapturingRuntime();
		const server = new HonoHttpServerAdapter(runtime);
		server.register(HttpMethod.POST, "/login", async () => {
			throw new InvalidCredentialsError();
		});
		await server.listen(8127);
		const response = await runtime.handler?.(
			new Request("http://localhost/login", { method: "POST" }),
		);
		expect(response?.status).toBe(401);
		expect(await response?.json()).toEqual({
			message: "Email or password is invalid",
			code: "INVALID_CREDENTIALS",
		});
	});

	it("maps missing products to HTTP 404", async () => {
		const runtime = new CapturingRuntime();
		const server = new HonoHttpServerAdapter(runtime);
		server.register(HttpMethod.GET, "/products/:code", async (req) => {
			throw new ProductNotFoundError(req.params.code ?? "unknown");
		});
		await server.listen(8128);
		const response = await runtime.handler?.(
			new Request("http://localhost/products/MISSING"),
		);
		expect(response?.status).toBe(404);
		expect(await response?.json()).toEqual({
			message: "Product with code MISSING was not found",
			code: "PRODUCT_NOT_FOUND",
		});
	});

	it("supports text responses", async () => {
		const runtime = new CapturingRuntime();
		const server = new HonoHttpServerAdapter(runtime);
		server.register(HttpMethod.GET, "/text", async () => ({
			status: HttpStatusCode.OK,
			body: "ready",
			headers: { "Content-Type": "text/plain" },
		}));
		await server.listen(8125);
		const response = await runtime.handler?.(
			new Request("http://localhost/text"),
		);
		expect(await response?.text()).toBe('"ready"');
	});
});
