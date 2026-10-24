import { describe, expect, it, mock, spyOn } from "bun:test";
import { authenticatedSession } from "@test/support/fixtures/authenticatedSession";
import type { CatalogRepository } from "@/application/CatalogRepository";
import { CatalogService } from "@/application/CatalogService";
import { HonoHttpServerAdapter } from "@/external/http/HonoHttpServerAdapter";
import { CatalogRestController } from "@/infra/controllers/http/CatalogRestController";
import type { FetchHandler } from "@/infra/http/HttpRestRuntime";

async function setup() {
	const session = await authenticatedSession();
	const repository: CatalogRepository = {
		listCategories: mock(async () => []),
		createOption: mock(async (_id, name) => ({ id: "option", name })),
		removeOption: mock(async () => {}),
		getProductOptions: mock(async (_code: string) => [] as string[]),
		setProductOptions: mock(async () => {}),
		createOutfit: mock(async (name, productCodes) => ({
			code: "OUT-AAAAAAAAAAAAAAAA",
			name,
			productCodes,
		})),
		getOutfit: mock(async (code) => ({
			code,
			name: "Look",
			productCodes: ["ABCD"],
		})),
		removeOutfit: mock(async () => {}),
	};
	let handler: FetchHandler | undefined;
	const server = new HonoHttpServerAdapter({
		serve: async (fetchHandler) => {
			handler = fetchHandler;
			return { port: 0, stop: async () => {} };
		},
	});
	new CatalogRestController(
		server,
		new CatalogService(repository, session.authenticator),
		"session",
	);
	await server.listen(0);
	const invoke = (request: Request) => {
		if (!handler) throw new Error("Missing handler");
		return handler(request);
	};
	const request = (
		method: string,
		path: string,
		body?: unknown,
		token = "session-token",
	) =>
		invoke(
			new Request(`http://localhost${path}`, {
				method,
				headers: {
					Cookie: `session=${token}`,
					"Content-Type": "application/json",
				},
				...(body === undefined ? {} : { body: JSON.stringify(body) }),
			}),
		);
	return { ...session, request, repository };
}
const routes = [
	["GET", "/products/ABCD/filter-options", undefined, 200],
	["POST", "/filter-categories/color/options", { name: "Azul" }, 201],
	["DELETE", "/filter-options/option", undefined, 204],
	["PUT", "/products/ABCD/filter-options", { optionIds: ["option"] }, 204],
	["POST", "/outfits", { name: "Look", productCodes: ["ABCD"] }, 201],
	["GET", "/outfits/OUT-AAAAAAAAAAAAAAAA", undefined, 200],
	["DELETE", "/outfits/OUT-AAAAAAAAAAAAAAAA", undefined, 204],
] as const;
describe("CatalogRestController", () => {
	for (const [method, path, body, status] of routes) {
		it(`${method} ${path} accepts an admin`, async () => {
			const { request } = await setup();
			const response = await request(method, path, body);
			expect(response.status).toBe(status);
		});
		it(`${method} ${path} rejects missing/invalid sessions and non-admins`, async () => {
			const { request, authenticator, user, repository } = await setup();
			expect((await request(method, path, body, "")).status).toBe(401);
			expect((await request(method, path, body, "invalid")).status).toBe(401);
			spyOn(authenticator, "authenticate").mockResolvedValue(user);
			spyOn(user, "getRole").mockReturnValue("user");
			expect((await request(method, path, body)).status).toBe(403);
			for (const fn of Object.values(repository))
				expect(fn).not.toHaveBeenCalled();
		});
	}
	it("returns a generated outfit code and rejects invalid payloads", async () => {
		const { request } = await setup();
		const response = await request("POST", "/outfits", {
			name: "Look",
			productCodes: ["ABCD"],
		});
		expect(await response.json()).toMatchObject({
			code: "OUT-AAAAAAAAAAAAAAAA",
			productCodes: ["ABCD"],
		});
		for (const body of [null, [], {}, { name: "Look", productCodes: [] }])
			expect((await request("POST", "/outfits", body)).status).toBe(400);
	});
});
