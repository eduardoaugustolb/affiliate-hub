import { describe, expect, it, spyOn } from "bun:test";
import { IdGeneratorFake } from "@test/support/fakes/IdGeneratorFake";
import { ProductRepositoryFake } from "@test/support/fakes/ProductRepositoryFake";
import { authenticatedSession } from "@test/support/fixtures/authenticatedSession";
import { GetAuthenticatedUser } from "@/application/usecases/queries/GetAuthenticatedUser";
import { ResolveProduct } from "@/application/usecases/queries/ResolveProduct";
import { Product } from "@/domain/entities/Product";
import { HonoHttpServerAdapter } from "@/external/http/HonoHttpServerAdapter";
import { WebController } from "@/infra/controllers/http/WebController";
import type { FetchHandler } from "@/infra/http/HttpRestRuntime";

async function setup(status = "active") {
	const session = await authenticatedSession();
	const repo = new ProductRepositoryFake(new IdGeneratorFake());
	await repo.save(
		Product.create(
			"A7K2",
			"https://example.com/affiliate?ref=creator",
			"shein",
			"https://example.com/image.jpg",
			status,
		),
	);
	let handler: FetchHandler | undefined;
	const server = new HonoHttpServerAdapter({
		serve: async (fetchHandler) => {
			handler = fetchHandler;
			return { port: 0, stop: async () => {} };
		},
	});
	new WebController(
		server,
		new ResolveProduct(repo),
		new GetAuthenticatedUser(session.authenticator),
		"session",
	);
	await server.listen(0);
	async function request(path: string, authenticated = false) {
		if (!handler) throw new Error("Missing handler");
		return handler(
			new Request(`http://localhost${path}`, {
				headers: authenticated ? { Cookie: "session=session-token" } : {},
			}),
		);
	}
	return { ...session, request };
}
describe("WebController", () => {
	it("serves a mobile-friendly home with a working GET form", async () => {
		const { request } = await setup();
		const response = await request("/");
		expect(response.status).toBe(200);
		expect(response.headers.get("content-type")).toContain("text/html");
		const html = await response.text();
		expect(html).toContain('action="/resolve"');
		expect(html).toContain('name="viewport"');
		expect(html).not.toContain("<!--message-->");
	});
	it.each(["/A7K2", "/a7k2", "/resolve?code=%20a7K2%20"])(
		"redirects active codes: %s",
		async (path) => {
			const { request } = await setup();
			const response = await request(path);
			expect(response.status).toBe(302);
			expect(response.headers.get("location")).toBe(
				"https://example.com/affiliate?ref=creator",
			);
			expect(response.headers.get("cache-control")).toBe("no-store");
		},
	);
	it("shows a friendly 404 without redirecting", async () => {
		const { request } = await setup();
		const response = await request("/ZZZZ");
		expect(response.status).toBe(404);
		expect(response.headers.get("location")).toBeNull();
		expect(await response.text()).toContain("Produto não encontrado.");
	});
	it("shows inactive products as unavailable without redirecting", async () => {
		const { request } = await setup("inactive");
		const response = await request("/A7K2");
		expect(response.status).toBe(410);
		expect(response.headers.get("location")).toBeNull();
		expect(await response.text()).toContain("Produto indisponível.");
	});
	it("protects admin HTML and serves it for an authenticated admin", async () => {
		const { request } = await setup();
		const anonymous = await request("/admin");
		expect(anonymous.status).toBe(303);
		expect(anonymous.headers.get("location")).toBe("/admin/login");
		const response = await request("/admin", true);
		expect(response.status).toBe(200);
		expect(await response.text()).toContain("Produtos dos posts.");
		expect(response.headers.get("cache-control")).toBe("no-store");
	});
	it("denies non-admin sessions", async () => {
		const { request, user, authenticator } = await setup();
		spyOn(authenticator, "authenticate").mockResolvedValue(user);
		spyOn(user, "getRole").mockReturnValue("user");
		expect((await request("/admin", true)).status).toBe(403);
	});
	it.each([
		["/assets/app.css", "text/css"],
		["/assets/admin.js", "text/javascript"],
		["/assets/login.js", "text/javascript"],
	] as const)(
		"serves assets with the right content type: %s",
		async (path, contentType) => {
			const { request } = await setup();
			const response = await request(path);
			expect(response.status).toBe(200);
			expect(response.headers.get("content-type")).toContain(contentType);
		},
	);
});
