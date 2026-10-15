import { describe, expect, it } from "bun:test";
import { BunRuntimeAdapter } from "@/external/http/BunRuntimeAdapter";
import type { RunningRestServer } from "@/infra/http/HttpRestRuntime";

describe("BunRuntimeAdapter", () => {
	it("passes the handler and options to Bun and stops the server", async () => {
		const runtime = new BunRuntimeAdapter();
		const requests: {
			fetch: typeof handler;
			port: number;
			hostname?: string;
		}[] = [];
		let stopped = false;
		function handler() {
			return new Response("ok");
		}
		const originalServe = Bun.serve;
		Bun.serve = ((options: {
			fetch: typeof handler;
			port: number;
			hostname?: string;
		}) => {
			requests.push(options);
			return {
				port: 43210,
				stop: () => {
					stopped = true;
				},
			} as ReturnType<typeof Bun.serve>;
		}) as unknown as typeof Bun.serve;
		let server: RunningRestServer;
		try {
			server = await runtime.serve(handler, { port: 0, hostname: "127.0.0.1" });
		} finally {
			Bun.serve = originalServe;
		}
		expect(requests).toEqual([
			{ fetch: handler, port: 0, hostname: "127.0.0.1" },
		]);
		expect(server.port).toBe(43210);
		await server.stop();
		expect(stopped).toBe(true);
	});

	it("rejects a Bun server that does not provide an active port", () => {
		const originalServe = Bun.serve;
		Bun.serve = (() => ({ port: 0, stop() {} })) as unknown as typeof Bun.serve;
		try {
			return expect(
				new BunRuntimeAdapter().serve(() => new Response(), { port: 0 }),
			).rejects.toThrow("Bun.serve did not return the door");
		} finally {
			Bun.serve = originalServe;
		}
	});
});
