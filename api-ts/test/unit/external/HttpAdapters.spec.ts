import { describe, expect, it } from "bun:test";
import { HonoAdapter } from "@/external/http/HonoAdapter";
import type {
	FetchHandler,
	HttpRuntime,
	RunningServer,
} from "@/infra/http/HttpRuntime";
import { HttpMethod, HttpStatusCode } from "@/infra/http/HttpServer";

class CapturingRuntime implements HttpRuntime {
	handler?: FetchHandler;
	options?: { port: number; hostname?: string };
	stopped = false;
	async serve(
		handler: FetchHandler,
		options: { port: number; hostname?: string },
	): Promise<RunningServer> {
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

describe("HonoAdapter", () => {
	it("maps incoming request data to the handler and returns JSON response", async () => {
		const runtime = new CapturingRuntime();
		const server = new HonoAdapter(runtime);
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
		const server = new HonoAdapter(runtime);
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

	it("supports text responses", async () => {
		const runtime = new CapturingRuntime();
		const server = new HonoAdapter(runtime);
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
