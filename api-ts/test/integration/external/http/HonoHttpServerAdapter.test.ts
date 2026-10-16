import { describe, expect, it } from "bun:test";
import { InvalidCredentialsError } from "@/application/errors/InvalidCredentialsError";
import { ProductNotFoundError } from "@/application/errors/ProductNotFoundError";
import { UserAlreadyExistsError } from "@/application/errors/UserAlreadyExistsError";
import { HonoHttpServerAdapter } from "@/external/http/HonoHttpServerAdapter";
import type {
	FetchHandler,
	HttpRestRuntime,
	RunningRestServer,
} from "@/infra/http/HttpRestRuntime";
import { HttpMethod, HttpStatusCode } from "@/infra/http/HttpRestServer";

class CapturingRuntime implements HttpRestRuntime {
	handler?: FetchHandler;
	options?: { port: number; hostname?: string };
	stopped = false;
	async serve(
		handler: FetchHandler,
		options: { port: number; hostname?: string },
	): Promise<RunningRestServer> {
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
		server.register(HttpMethod.POST, "/products/:id", async (req, res) =>
			res.json({
				id: req.params.id,
				q: req.query.q,
				name: (req.body as { name: string }).name,
				agent: req.headers["user-agent"],
			}),
		);
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
		server.register(HttpMethod.GET, "/text", async (_, res) =>
			res.text("ready"),
		);
		await server.listen(8125);
		const response = await runtime.handler?.(
			new Request("http://localhost/text"),
		);
		expect(await response?.text()).toBe("ready");
	});
});

// Cookies are part of the REST contract; controllers do not depend on Hono.
describe("HonoHttpServerAdapter cookies", () => {
	async function respond(
		cookies: import("@/infra/http/HttpRestServer").HttpRestCookie[],
	) {
		const runtime = new CapturingRuntime();
		const server = new HonoHttpServerAdapter(runtime);
		server.register(HttpMethod.POST, "/login", async (_, res) => {
			for (const { name, value, ...options } of cookies)
				res.setCookie(name, value, options);
			return res
				.header("Cache-Control", "no-store")
				.json({ authenticated: true });
		});
		await server.listen(0);
		if (!runtime.handler) throw new Error("HTTP handler was not registered");
		return runtime.handler(
			new Request("http://localhost/login", { method: "POST" }),
		);
	}

	it("sets a secure host session cookie and preserves response headers and JSON", async () => {
		const response = await respond([
			{
				name: "__Host-session",
				value: "secret-token",
				path: "/",
				secure: true,
				httpOnly: true,
				sameSite: "Strict",
				maxAge: 3600,
			},
		]);
		expect(response.status).toBe(200);
		expect(response.headers.get("content-type")).toContain("application/json");
		expect(response.headers.get("cache-control")).toBe("no-store");
		expect(await response.json()).toEqual({ authenticated: true });
		const cookies = response.headers.getSetCookie();
		expect(cookies).toHaveLength(1);
		expect(cookies[0]?.split("; ")).toEqual(
			expect.arrayContaining([
				"__Host-session=secret-token",
				"Path=/",
				"Secure",
				"HttpOnly",
				"SameSite=Strict",
				"Max-Age=3600",
			]),
		);
		expect(cookies[0]).not.toContain("Domain=");
	});

	it("supports a development session cookie without Secure", async () => {
		const response = await respond([
			{
				name: "session",
				value: "dev-token",
				path: "/",
				httpOnly: true,
				sameSite: "Strict",
			},
		]);
		expect(response.headers.getSetCookie()).toEqual([
			"session=dev-token; Path=/; HttpOnly; SameSite=Strict",
		]);
	});

	it("preserves separate Set-Cookie headers, expiration, and encoded values", async () => {
		const expires = new Date("2020-01-01T00:00:00Z");
		const response = await respond([
			{
				name: "session",
				value: "",
				path: "/",
				httpOnly: true,
				maxAge: 0,
				expires,
			},
			{
				name: "preference",
				value: "a;b=c",
				domain: "example.com",
				sameSite: "Lax",
			},
		]);
		expect(response.headers.getSetCookie()).toEqual([
			"session=; Max-Age=0; Path=/; Expires=Wed, 01 Jan 2020 00:00:00 GMT; HttpOnly",
			"preference=a%3Bb%3Dc; Domain=example.com; Path=/; SameSite=Lax",
		]);
	});

	it.each([
		{ secure: false, path: "/" },
		{ secure: true, path: "/private" },
		{ secure: true, path: "/", domain: "example.com" },
	])(
		"rejects invalid __Host- options: %j without emitting partial cookies",
		async (options) => {
			const response = await respond([
				{ name: "preference", value: "dark" },
				{ name: "__Host-session", value: "secret-token", ...options },
			]);
			expect(response.status).toBe(500);
			expect(response.headers.getSetCookie()).toEqual([]);
		},
	);
});

describe("HonoHttpServerAdapter response methods", () => {
	it("sets custom status and headers and does not leak response state across requests", async () => {
		const runtime = new CapturingRuntime();
		const server = new HonoHttpServerAdapter(runtime);
		server.register(HttpMethod.POST, "/users", async (_, res) =>
			res
				.status(HttpStatusCode.CREATED)
				.header("X-Request-Id", "123")
				.json({ id: "u-1" }),
		);
		server.register(HttpMethod.GET, "/health", async (_, res) =>
			res.text("OK"),
		);
		await server.listen(0);
		if (!runtime.handler) throw new Error("Missing handler");
		const created = await runtime.handler(
			new Request("http://localhost/users", { method: "POST" }),
		);
		expect(created.status).toBe(201);
		expect(created.headers.get("x-request-id")).toBe("123");
		expect(created.headers.get("content-type")).toBe(
			"application/json; charset=UTF-8",
		);
		expect(await created.json()).toEqual({ id: "u-1" });
		const health = await runtime.handler(
			new Request("http://localhost/health"),
		);
		expect(health.status).toBe(200);
		expect(health.headers.get("x-request-id")).toBeNull();
		expect(health.headers.get("content-type")).toBe(
			"text/plain; charset=UTF-8",
		);
		expect(await health.text()).toBe("OK");
	});

	it("returns HTML without JSON encoding", async () => {
		const runtime = new CapturingRuntime();
		const server = new HonoHttpServerAdapter(runtime);
		server.register(HttpMethod.GET, "/", async (_, res) =>
			res.html('<h1 class="title">Hello</h1>'),
		);
		await server.listen(0);
		const response = await runtime.handler?.(new Request("http://localhost/"));
		expect(response?.headers.get("content-type")).toBe(
			"text/html; charset=UTF-8",
		);
		expect(await response?.text()).toBe('<h1 class="title">Hello</h1>');
	});

	it.each([HttpStatusCode.NO_CONTENT, HttpStatusCode.OK])(
		"clears a cookie with an empty %i response",
		async (status) => {
			const runtime = new CapturingRuntime();
			const server = new HonoHttpServerAdapter(runtime);
			server.register(HttpMethod.POST, "/logout", async (_, res) =>
				res
					.clearCookie("__Host-session", {
						path: "/",
						secure: true,
						httpOnly: true,
						sameSite: "Strict",
					})
					.empty(status),
			);
			await server.listen(0);
			const response = await runtime.handler?.(
				new Request("http://localhost/logout", { method: "POST" }),
			);
			expect(response?.status).toBe(status);
			expect(await response?.text()).toBe("");
			expect(response?.headers.getSetCookie()).toEqual([
				"__Host-session=; Max-Age=0; Path=/; Expires=Thu, 01 Jan 1970 00:00:00 GMT; HttpOnly; Secure; SameSite=Strict",
			]);
		},
	);
});

describe("HonoHttpServerAdapter malformed JSON", () => {
	it("returns 400 instead of 500 before invoking the handler", async () => {
		const runtime = new CapturingRuntime();
		const server = new HonoHttpServerAdapter(runtime);
		let invoked = false;
		server.register(HttpMethod.POST, "/products", async (_, res) => {
			invoked = true;
			return res.empty();
		});
		await server.listen(0);
		const response = await runtime.handler?.(
			new Request("http://localhost/products", {
				method: "POST",
				headers: { "Content-Type": "application/json" },
				body: "{",
			}),
		);
		expect(response?.status).toBe(400);
		expect(invoked).toBe(false);
	});
});
