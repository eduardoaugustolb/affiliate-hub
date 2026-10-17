import {
	afterAll,
	afterEach,
	beforeAll,
	beforeEach,
	describe,
	expect,
	it,
} from "bun:test";
import { productFake } from "@test/support/fixtures/productFake";
import { Product } from "@/domain/entities/Product";
import { User } from "@/domain/entities/User";
import { BunUUIDIdGenerator } from "@/external/BunUUIDIdGenerator";
import { BunSQLAdapter } from "@/external/database/BunSQLAdapter";
import { ProductDAOSQL } from "@/external/database/DAOs/ProductDAOSQL";
import { UserDAOSQL } from "@/external/database/DAOs/UserDAOSQL";
import { BunPasswordHasher } from "@/external/hash/BunPasswordHasher";
import { FetchHttpClientAdapter } from "@/external/http/FetchHttpClientAdapter";
import { UserRepositoryDatabase } from "@/infra/database/repositories/UserRepositoryDatabase";
import type { HttpClient } from "@/infra/http/HttpClient";

// Run against a running API connected to the same migrated test database:
// TEST_DATABASE_URL=... TEST_API_URL=http://localhost:3000 bun test test/api/product.test.ts
// TDD contract: POST /products requires an admin session and returns 201;
// GET /products/:code is public and returns a flat product DTO.
// Cookies are sent explicitly; browser cookie policy requires separate verification.
const { TEST_DATABASE_URL, TEST_API_URL } = process.env;
const cookieName =
	process.env.SESSION_COOKIE_NAME ??
	(process.env.BUN_ENV === "production" ? "__Host-session" : "session");

describe.skipIf(!TEST_API_URL || !TEST_DATABASE_URL)("Products API", () => {
	let database: BunSQLAdapter;
	let productDAO: ProductDAOSQL;
	let userRepo: UserRepositoryDatabase;
	let userId: string | undefined;
	let email: string;
	let passwordHash: string;
	let input: {
		name: string;
		destinationUrl: string;
		marketplace: string;
		imageUrl: string;
		status: string;
	};
	const password = "Test-password-123!";
	const httpClient: HttpClient = new FetchHttpClientAdapter();

	function url(path: string) {
		return new URL(path, TEST_API_URL).toString();
	}

	function create(body: unknown = input, token?: string) {
		return httpClient.post(url("/products"), body, {
			headers: token === undefined ? {} : { Cookie: `${cookieName}=${token}` },
			timeoutMs: 5000,
		});
	}

	async function login() {
		const response = await httpClient.post(
			url("/auth/login"),
			{ email, password },
			{ timeoutMs: 5000 },
		);
		expect(response.statusCode).toBe(200);
		const cookie = response.cookies.find((value) =>
			value.startsWith(`${cookieName}=`),
		);
		const token = cookie?.split(";")[0]?.slice(`${cookieName}=`.length);
		if (!token) throw new Error("Missing session cookie");
		return token;
	}

	beforeAll(async () => {
		if (!TEST_DATABASE_URL) throw new Error("TEST_DATABASE_URL is required");
		database = new BunSQLAdapter({ dbUrl: TEST_DATABASE_URL });
		productDAO = new ProductDAOSQL(database);
		userRepo = new UserRepositoryDatabase(
			new UserDAOSQL(database),
			new BunUUIDIdGenerator(),
		);
		passwordHash = await new BunPasswordHasher().hash(password);
	});

	beforeEach(() => {
		userId = undefined;
		email = `product-${crypto.randomUUID()}@example.com`;
		input = {
			name: "Produto",
			destinationUrl: `https://example.com/products/${crypto.randomUUID()}`,
			marketplace: productFake.marketplace,
			imageUrl: productFake.imageUrl,
			status: productFake.status,
		};
	});

	afterEach(async () => {
		// Only delete records owned by this test, including products created by HTTP.
		try {
			for (const product of await productDAO.findByDestinationUrl({
				destinationUrl: input.destinationUrl,
			})) {
				await productDAO.remove({ id: product.id });
			}
		} finally {
			// Deleting the user also cascades deletion to its sessions.
			if (userId) await userRepo.deleteById(userId);
		}
	});

	afterAll(async () => {
		await database?.close();
	});

	describe("POST /products", () => {
		beforeEach(async () => {
			await userRepo.save(
				User.create("Product Test", email, passwordHash, "admin"),
			);
			const user = await userRepo.findByEmail(email);
			if (!user) throw new Error("Test user was not persisted");
			userId = user.getId();
		});

		it("creates and persists a product for an authenticated admin", async () => {
			const response = await create(input, await login());
			expect(response.statusCode).toBe(201);
			const products = await productDAO.findByDestinationUrl({
				destinationUrl: input.destinationUrl,
			});
			expect(products).toHaveLength(1);
			const product = products[0];
			if (!product) throw new Error("Product was not persisted");
			expect(product).toMatchObject(input);
			expect(product.id).toBeString();
			expect(product.id.length).toBeGreaterThan(0);
			expect(product.code).toMatch(/^[A-HJ-NP-Z1-9]+$/);
			const fetched = await httpClient.get(url(`/products/${product.code}`), {
				timeoutMs: 5000,
			});
			expect(fetched.statusCode).toBe(200);
			expect(fetched.body).toEqual({
				id: product.id,
				code: product.code,
				...input,
				createdAt: product.createdAt.toISOString(),
				updatedAt: product.updatedAt.toISOString(),
			});
		});

		it.each([undefined, "", "unknown-session-token"])(
			"rejects a missing or invalid session: %j",
			async (token) => {
				const response = await create(input, token);
				expect(response.statusCode).toBe(401);
				expect(response.body).toMatchObject({ code: "INVALID_CREDENTIALS" });
				expect(
					await productDAO.findByDestinationUrl({
						destinationUrl: input.destinationUrl,
					}),
				).toEqual([]);
			},
		);

		it.each([
			null,
			[[]],
			{},
			...["destinationUrl", "marketplace", "imageUrl", "status"].flatMap(
				(field) => [
					{ field, value: undefined },
					{ field, value: 123 },
				],
			),
		])("rejects malformed input: %j", async (invalid) => {
			const body =
				invalid &&
				"field" in invalid &&
				"value" in invalid &&
				typeof invalid.field === "string"
					? {
							...input,
							[invalid.field]: (invalid as { value: unknown }).value,
						}
					: invalid;
			const response = await create(body, await login());
			expect(response.statusCode).toBe(400);
			expect(
				await productDAO.findByDestinationUrl({
					destinationUrl: input.destinationUrl,
				}),
			).toEqual([]);
		});

		it.each([
			["destinationUrl", "http://example.com"],
			["imageUrl", "http://example.com/image.jpg"],
			["marketplace", "invalid"],
			["status", "invalid"],
		])("rejects an invalid %s", async (field, value) => {
			const response = await create(
				{ ...input, [field as string]: value },
				await login(),
			);
			expect(response.statusCode).toBe(422);
			expect(
				await productDAO.findByDestinationUrl({
					destinationUrl: input.destinationUrl,
				}),
			).toEqual([]);
		});
	});

	describe("GET /products/:code", () => {
		it("returns a product by code without authentication", async () => {
			const id = crypto.randomUUID();
			// Hex digits exclude zero because the product alphabet omits it.
			const code = crypto
				.randomUUID()
				.replaceAll("-", "")
				.replaceAll("0", "A")
				.replaceAll("1", "B")
				.toUpperCase()
				.slice(0, 6);
			const product = Product.create(
				code,
				input.destinationUrl,
				input.marketplace,
				input.imageUrl,
				input.status,
			);
			await productDAO.save({ id, code: product.getCode(), ...input });
			const response = await httpClient.get(url(`/products/${code}`), {
				timeoutMs: 5000,
			});
			expect(response.statusCode).toBe(200);
			expect(response.body).toEqual({
				id,
				code,
				...input,
				createdAt: expect.any(String),
				updatedAt: expect.any(String),
			});
		});

		it("returns 404 for an unknown code", async () => {
			const code = crypto
				.randomUUID()
				.replaceAll("-", "")
				.replaceAll("0", "A")
				.replaceAll("1", "B")
				.toUpperCase()
				.slice(0, 6);
			const response = await httpClient.get(url(`/products/${code}`), {
				timeoutMs: 5000,
			});
			expect(response.statusCode).toBe(404);
			expect(response.body).toMatchObject({ code: "PRODUCT_NOT_FOUND" });
		});
	});
	describe("product mutations", () => {
		let id: string;
		let code: string;
		beforeEach(async () => {
			await userRepo.save(
				User.create("Product Test", email, passwordHash, "admin"),
			);
			const user = await userRepo.findByEmail(email);
			if (!user) throw new Error("Missing test user");
			userId = user.getId();
			id = crypto.randomUUID();
			do {
				code = crypto
					.randomUUID()
					.replaceAll("-", "")
					.replaceAll("0", "A")
					.replaceAll("1", "B")
					.toUpperCase()
					.slice(0, 6);
			} while (await productDAO.findByCode({ code: code }));
			await productDAO.save({ id, code, ...input });
		});
		afterEach(async () => {
			await productDAO.remove({ id: id });
		});
		function mutate(
			method: "PUT" | "DELETE",
			token?: string,
			body: unknown = input,
			targetCode = code,
		) {
			const options: HttpClient.Options = {
				timeoutMs: 5000,
				headers:
					token === undefined ? {} : { Cookie: `${cookieName}=${token}` },
			};
			return method === "PUT"
				? httpClient.put(url(`/products/${targetCode}`), body, options)
				: httpClient.delete(url(`/products/${targetCode}`), options);
		}
		it("updates a product through PUT and exposes the persisted values through GET", async () => {
			const updated = {
				name: "Produto atualizado",
				destinationUrl: `${input.destinationUrl}/updated`,
				marketplace: "shopee",
				imageUrl: "https://example.com/updated.jpg",
				status: "inactive",
			};
			const response = await mutate("PUT", await login(), updated);
			expect(response.statusCode).toBe(204);
			expect(await productDAO.findById({ id: id })).toMatchObject({
				id,
				code,
				...updated,
			});
			const fetched = await httpClient.get(url(`/products/${code}`), {
				timeoutMs: 5000,
			});
			expect(fetched.statusCode).toBe(200);
			expect(fetched.body).toEqual({
				id,
				code,
				...updated,
				createdAt: expect.any(String),
				updatedAt: expect.any(String),
			});
		});
		it("deletes a product through DELETE and makes it unavailable through GET", async () => {
			const response = await mutate("DELETE", await login());
			expect(response.statusCode).toBe(204);
			expect(await productDAO.findById({ id: id })).toBeUndefined();
			const fetched = await httpClient.get(url(`/products/${code}`), {
				timeoutMs: 5000,
			});
			expect(fetched.statusCode).toBe(404);
			expect(fetched.body).toMatchObject({ code: "PRODUCT_NOT_FOUND" });
		});
		for (const method of ["PUT", "DELETE"] as const) {
			it.each([undefined, "unknown-token"])(
				`${method} rejects an invalid session: %j`,
				async (token) => {
					const response = await mutate(method, token);
					expect(response.statusCode).toBe(401);
					expect(response.body).toMatchObject({ code: "INVALID_CREDENTIALS" });
					expect(await productDAO.findById({ id: id })).toMatchObject({
						id,
						code,
						...input,
					});
				},
			);
			it(`${method} returns 404 for an unknown product`, async () => {
				const response = await mutate(method, await login(), input, "MISSING");
				expect(response.statusCode).toBe(404);
				expect(response.body).toMatchObject({ code: "PRODUCT_NOT_FOUND" });
			});
		}
		it("PUT rejects malformed input without changing the product", async () => {
			const response = await mutate("PUT", await login(), {});
			expect(response.statusCode).toBe(400);
			expect(await productDAO.findById({ id: id })).toMatchObject({
				id,
				code,
				...input,
			});
		});
		it("PUT rejects invalid domain data without changing the product", async () => {
			const response = await mutate("PUT", await login(), {
				...input,
				status: "invalid",
			});
			expect(response.statusCode).toBe(422);
			expect(await productDAO.findById({ id: id })).toMatchObject({
				id,
				code,
				...input,
			});
		});
	});
});
