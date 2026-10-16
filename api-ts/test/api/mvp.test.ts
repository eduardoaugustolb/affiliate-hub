import {
	afterAll,
	afterEach,
	beforeAll,
	beforeEach,
	describe,
	expect,
	it,
} from "bun:test";
import { ProductCodeAlreadyExistsError } from "@/application/errors/ProductCodeAlreadyExistsError";
import { User } from "@/domain/entities/User";
import { BunProductCodeGenerator } from "@/external/BunProductCodeGenerator";
import { BunUUIDIdGenerator } from "@/external/BunUUIDIdGenerator";
import { BunSQLAdapter } from "@/external/database/BunSQLAdapter";
import { ProductDAOSQL } from "@/external/database/DAOs/ProductDAOSQL";
import { UserDAOSQL } from "@/external/database/DAOs/UserDAOSQL";
import { BunPasswordHasher } from "@/external/hash/BunPasswordHasher";
import { UserRepositoryDatabase } from "@/infra/database/repositories/UserRepositoryDatabase";

const { TEST_API_URL, TEST_DATABASE_URL } = process.env;
const cookieName =
	process.env.SESSION_COOKIE_NAME ??
	(process.env.BUN_ENV === "production" ? "__Host-session" : "session");

describe.skipIf(!TEST_API_URL || !TEST_DATABASE_URL)(
	"MVP flow with PostgreSQL",
	() => {
		let database: BunSQLAdapter;
		let products: ProductDAOSQL;
		let users: UserRepositoryDatabase;
		let userId: string;
		let cookie: string;
		let passwordHash: string;
		let ids: string[];
		let product: {
			id: string;
			code: string;
			name: string;
			destinationUrl: string;
			marketplace: string;
			imageUrl: string;
			status: string;
		};
		const password = "Mvp-test-password-123!";
		function request(path: string, options: RequestInit = {}) {
			return fetch(new URL(path, TEST_API_URL), {
				...options,
				redirect: "manual",
				signal: AbortSignal.timeout(5000),
			});
		}
		beforeAll(async () => {
			if (!TEST_DATABASE_URL) throw new Error("TEST_DATABASE_URL is required");
			database = new BunSQLAdapter({ dbUrl: TEST_DATABASE_URL });
			products = new ProductDAOSQL(database);
			users = new UserRepositoryDatabase(
				new UserDAOSQL(database),
				new BunUUIDIdGenerator(),
			);
			passwordHash = await new BunPasswordHasher().hash(password);
		});
		beforeEach(async () => {
			ids = [];
			const email = `mvp-${crypto.randomUUID()}@example.com`;
			await users.save(User.create("MVP Test", email, passwordHash, "admin"));
			const user = await users.findByEmail(email);
			if (!user) throw new Error("Missing test user");
			userId = user.getId();
			const login = await request("/auth/login", {
				method: "POST",
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify({ email, password }),
			});
			expect(login.status).toBe(200);
			const sessionCookie = login.headers
				.getSetCookie()
				.find((value) => value.startsWith(`${cookieName}=`))
				?.split(";")[0];
			if (!sessionCookie) throw new Error("Missing login cookie");
			cookie = sessionCookie;
			product = {
				id: crypto.randomUUID(),
				code: new BunProductCodeGenerator().generate(),
				name: "Camiseta do post",
				destinationUrl: `https://example.com/affiliate/${crypto.randomUUID()}?ref=creator`,
				marketplace: "shein",
				imageUrl: "https://example.com/product.jpg",
				status: "active",
			};
			ids.push(product.id);
			await products.save(product);
		});
		afterEach(async () => {
			try {
				for (const id of ids) await products.remove(id);
			} finally {
				if (userId) await users.deleteById(userId);
			}
		});
		afterAll(async () => {
			await database?.close();
		});
		it("resolves lowercase codes and the home form with the exact affiliate URL", async () => {
			for (const path of [
				`/${product.code.toLowerCase()}`,
				"/resolve?code=" +
					encodeURIComponent(` ${product.code.toLowerCase()} `),
			]) {
				const response = await request(path);
				expect(response.status).toBe(302);
				expect(response.headers.get("Location")).toBe(product.destinationUrl);
				expect(response.headers.get("Cache-Control")).toBe("no-store");
			}
		});
		it("applies an edited destination and stops redirecting when deactivated", async () => {
			const updated = {
				...product,
				name: "Nome editado",
				destinationUrl: `${product.destinationUrl}&campaign=new`,
			};
			const headers = { Cookie: cookie, "Content-Type": "application/json" };
			expect(
				(
					await request(`/products/${product.code}`, {
						method: "PUT",
						headers,
						body: JSON.stringify(updated),
					})
				).status,
			).toBe(204);
			expect((await request(`/${product.code}`)).headers.get("Location")).toBe(
				updated.destinationUrl,
			);
			expect(
				(
					await request(`/products/${product.code}`, {
						method: "PUT",
						headers,
						body: JSON.stringify({ ...updated, status: "inactive" }),
					})
				).status,
			).toBe(204);
			const inactive = await request(`/${product.code}`);
			expect(inactive.status).toBe(410);
			expect(inactive.headers.get("Location")).toBeNull();
			expect(await inactive.text()).toContain("Produto indisponível.");
			expect((await products.findByCode(product.code))?.name).toBe(
				updated.name,
			);
		});
		it("never reuses a deleted code, including a direct SQL insert", async () => {
			expect(
				(
					await request(`/products/${product.code}`, {
						method: "DELETE",
						headers: { Cookie: cookie },
					})
				).status,
			).toBe(204);
			expect((await request(`/${product.code}`)).status).toBe(404);
			expect(
				products.save({ ...product, id: crypto.randomUUID() }),
			).rejects.toBeInstanceOf(ProductCodeAlreadyExistsError);
			expect(await products.findByCode(product.code)).toBeUndefined();
		});
		it("prevents changing an issued code directly in persistence", async () => {
			try {
				await products.update({
					...product,
					code: new BunProductCodeGenerator().generate(),
				});
				throw new Error("Expected immutable code rejection");
			} catch (error) {
				expect(String(error)).toContain("Product code is permanent");
			}
			expect((await products.findById(product.id))?.code).toBe(product.code);
		});
		it("reserves a code atomically under concurrent insertion", async () => {
			const code = new BunProductCodeGenerator().generate();
			const a = crypto.randomUUID(),
				b = crypto.randomUUID();
			ids.push(a, b);
			const results = await Promise.allSettled([
				products.save({ ...product, id: a, code }),
				products.save({ ...product, id: b, code }),
			]);
			expect(
				results.filter((result) => result.status === "fulfilled"),
			).toHaveLength(1);
			const rejected = results.find((result) => result.status === "rejected");
			expect(rejected?.status === "rejected" && rejected.reason).toBeInstanceOf(
				ProductCodeAlreadyExistsError,
			);
		});
		it("lists named products privately with bounded pagination", async () => {
			expect((await request("/products")).status).toBe(401);
			const response = await request("/products?limit=100&offset=0", {
				headers: { Cookie: cookie },
			});
			expect(response.status).toBe(200);
			expect(response.headers.get("Cache-Control")).toBe("no-store");
			const rows = (await response.json()) as Array<Record<string, unknown>>;
			expect(rows.length).toBeLessThanOrEqual(100);
			expect(
				rows.some(
					(row) => row.code === product.code && row.name === product.name,
				),
			).toBe(true);
			expect(
				(await request("/products?limit=1000", { headers: { Cookie: cookie } }))
					.status,
			).toBe(400);
		});
		it("returns the generated code when creating a named product", async () => {
			const response = await request("/products", {
				method: "POST",
				headers: { Cookie: cookie, "Content-Type": "application/json" },
				body: JSON.stringify(product),
			});
			expect(response.status).toBe(201);
			const body = (await response.json()) as { code: string };
			expect(body.code).toMatch(/^[A-HJ-NP-Z2-9]{6}$/);
			const created = await products.findByCode(body.code);
			if (!created) throw new Error("Missing created product");
			ids.push(created.id);
			expect(created.name).toBe(product.name);
		});
		it("protects the dashboard and revokes its session on logout", async () => {
			expect((await request("/admin")).status).toBe(303);
			expect(
				(await request("/admin", { headers: { Cookie: cookie } })).status,
			).toBe(200);
			const response = await request("/auth/logout", {
				method: "POST",
				headers: { Cookie: cookie },
			});
			expect(response.status).toBe(204);
			expect(response.headers.getSetCookie().join(";")).toContain("Max-Age=0");
			expect(
				(await request("/auth/me", { headers: { Cookie: cookie } })).status,
			).toBe(401);
			const page = await request("/admin", { headers: { Cookie: cookie } });
			expect(page.status).toBe(303);
			expect(page.headers.get("Location")).toBe("/admin/login");
		});
	},
);
