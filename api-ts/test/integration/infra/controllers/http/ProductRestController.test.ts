import { describe, expect, it, spyOn } from "bun:test";
import { IdGeneratorFake } from "@test/support/fakes/IdGeneratorFake";
import { ProductCodeGeneratorFake } from "@test/support/fakes/ProductCodeGeneratorFake";
import { ProductRepositoryFake } from "@test/support/fakes/ProductRepositoryFake";
import { authenticatedSession } from "@test/support/fixtures/authenticatedSession";
import { dateProvider } from "@test/support/fixtures/dateProvider";
import { productFake } from "@test/support/fixtures/productFake";
import { CreateProduct } from "@/application/usecases/commands/CreateProduct";
import { DeleteProduct } from "@/application/usecases/commands/DeleteProduct";
import { UpdateProduct } from "@/application/usecases/commands/UpdateProduct";
import { GetProductByCode } from "@/application/usecases/queries/GetProductByCode";
import { Product } from "@/domain/entities/Product";
import { Session } from "@/domain/entities/Session";
import { HonoHttpServerAdapter } from "@/external/http/HonoHttpServerAdapter";
import { ProductRestController } from "@/infra/controllers/http/ProductRestController";
import type { FetchHandler } from "@/infra/http/HttpRestRuntime";

async function setup() {
	const session = await authenticatedSession();
	const repo = new ProductRepositoryFake(new IdGeneratorFake());
	await repo.save(
		Product.create(
			productFake.code,
			productFake.destinationUrl,
			productFake.marketplace,
			productFake.imageUrl,
			productFake.status,
		),
	);
	const original = await repo.findByCode(productFake.code);
	if (!original) throw new Error("Missing test product");
	let handler: FetchHandler | undefined;
	const server = new HonoHttpServerAdapter({
		serve: async (fetchHandler) => {
			handler = fetchHandler;
			return { port: 0, stop: async () => {} };
		},
	});
	new ProductRestController(
		server,
		new CreateProduct(
			repo,
			new ProductCodeGeneratorFake(),
			session.authenticator,
		),
		new GetProductByCode(repo),
		"custom-session",
		new UpdateProduct(repo, session.authenticator),
		new DeleteProduct(repo, session.authenticator),
	);
	await server.listen(0);
	const input = {
		destinationUrl: "https://example.com/updated",
		marketplace: "shopee",
		imageUrl: "https://example.com/new.jpg",
		status: "inactive",
	};
	async function request(
		method: string,
		body: unknown = input,
		token: string | null = session.actor.sessionToken,
		code = productFake.code,
	) {
		if (!handler) throw new Error("Missing handler");
		const headers = new Headers({ "Content-Type": "application/json" });
		if (token !== null) headers.set("Cookie", `custom-session=${token}`);
		return handler(
			new Request(`http://localhost/products/${code}`, {
				method,
				headers,
				...(method === "PUT" ? { body: JSON.stringify(body) } : {}),
			}),
		);
	}
	return { ...session, repo, original, input, request };
}

describe("ProductRestController", () => {
	it("PUT updates editable fields, preserves identity and returns empty 204", async () => {
		const { request, repo, original, input } = await setup();
		const response = await request("PUT", {
			...input,
			id: "forged",
			code: "FORGED",
		});
		expect(response.status).toBe(204);
		expect(await response.text()).toBe("");
		const product = await repo.findByCode(productFake.code);
		expect(product?.getId()).toBe(original.getId());
		expect(product?.getDestinationUrl()).toBe(input.destinationUrl);
		expect(product?.getMarketplace()).toBe(input.marketplace);
		expect(product?.getImageUrl()).toBe(input.imageUrl);
		expect(product?.getStatus()).toBe(input.status);
	});
	it("DELETE removes the product and returns empty 204", async () => {
		const { request, repo, original } = await setup();
		const response = await request("DELETE");
		expect(response.status).toBe(204);
		expect(await response.text()).toBe("");
		expect(await repo.findById(original.getId())).toBeUndefined();
		expect((await request("DELETE")).status).toBe(404);
	});
	for (const method of ["PUT", "DELETE"]) {
		describe(method, () => {
			it.each([null, "", "unknown"])(
				"rejects a missing or invalid cookie: %j",
				async (token) => {
					const { request, repo, original } = await setup();
					const response = await request(method, undefined, token);
					expect(response.status).toBe(401);
					expect(await response.json()).toMatchObject({
						code: "INVALID_CREDENTIALS",
					});
					expect(await repo.findByCode(productFake.code)).toEqual(original);
				},
			);
			it.each(["expired", "revoked"])("rejects a %s session", async (state) => {
				const { request, sessionRepo, user, repo, original } = await setup();
				const session = Session.rehydrate(
					"id",
					dateProvider.add(60000),
					state === "revoked" ? dateProvider.now() : null,
					user.getId(),
					"hashed:session-token",
					dateProvider,
				);
				if (state === "expired")
					spyOn(session, "getExpiresAt").mockReturnValue(dateProvider.now());
				spyOn(sessionRepo, "findByTokenHash").mockResolvedValue(session);
				const response = await request(method);
				expect(response.status).toBe(401);
				expect(await repo.findByCode(productFake.code)).toEqual(original);
			});
			it("rejects a non-admin without modifying the product", async () => {
				const { request, authenticator, user, repo, original } = await setup();
				spyOn(authenticator, "authenticate").mockResolvedValue(user);
				spyOn(user, "getRole").mockReturnValue("user");
				const response = await request(method);
				expect(response.status).toBe(403);
				expect(await response.json()).toMatchObject({
					code: "FORBIDDEN_OPERATION",
				});
				expect(await repo.findByCode(productFake.code)).toEqual(original);
			});
			it("returns 404 for an unknown code", async () => {
				const { request } = await setup();
				const response = await request(
					method,
					undefined,
					"session-token",
					"MISSING",
				);
				expect(response.status).toBe(404);
				expect(await response.json()).toMatchObject({
					code: "PRODUCT_NOT_FOUND",
				});
			});
		});
	}
	it.each([null, [[]], {}, { destinationUrl: 123 }])(
		"PUT rejects malformed payload: %j",
		async (body) => {
			const { request, repo, original } = await setup();
			const response = await request("PUT", body);
			expect(response.status).toBe(400);
			expect(await repo.findByCode(productFake.code)).toEqual(original);
		},
	);
	it.each(["destinationUrl", "marketplace", "imageUrl", "status"])(
		"PUT rejects invalid %s without modifying the product",
		async (field) => {
			const { request, input, repo, original } = await setup();
			const response = await request("PUT", { ...input, [field]: "invalid" });
			expect(response.status).toBe(422);
			expect(await repo.findByCode(productFake.code)).toEqual(original);
		},
	);
});
