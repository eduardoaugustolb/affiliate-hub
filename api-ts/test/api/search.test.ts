import { afterAll, beforeAll, describe, expect, it } from "bun:test";
import { productFake } from "@test/support/fixtures/productFake";
import { User } from "@/domain/entities/User";
import { BunProductCodeGenerator } from "@/external/BunProductCodeGenerator";
import { BunUUIDIdGenerator } from "@/external/BunUUIDIdGenerator";
import { BunSQLAdapter } from "@/external/database/BunSQLAdapter";
import { ProductDAOSQL } from "@/external/database/DAOs/ProductDAOSQL";
import { UserDAOSQL } from "@/external/database/DAOs/UserDAOSQL";
import { BunPasswordHasher } from "@/external/hash/BunPasswordHasher";
import { UserRepositoryDatabase } from "@/infra/database/repositories/UserRepositoryDatabase";

const { TEST_DATABASE_URL, TEST_API_URL } = process.env;
describe.skipIf(!TEST_DATABASE_URL || !TEST_API_URL)(
	"Public search API with admin-managed catalog",
	() => {
		let db: BunSQLAdapter;
		let products: ProductDAOSQL;
		let userId: string;
		let cookie: string;
		const suffix = crypto.randomUUID(),
			ids: string[] = [],
			codes: string[] = [],
			options: string[] = [];
		let outfitCode: string | undefined;
		const request = (
			path: string,
			method = "GET",
			body?: unknown,
			authenticated = false,
		) =>
			fetch(new URL(path, TEST_API_URL), {
				method,
				headers: {
					"Content-Type": "application/json",
					...(authenticated ? { Cookie: cookie } : {}),
				},
				...(body === undefined ? {} : { body: JSON.stringify(body) }),
				signal: AbortSignal.timeout(5000),
			});
		beforeAll(async () => {
			if (!TEST_DATABASE_URL) throw new Error("Missing test database");
			db = new BunSQLAdapter({ dbUrl: TEST_DATABASE_URL });
			products = new ProductDAOSQL(db);
			const users = new UserRepositoryDatabase(
				new UserDAOSQL(db),
				new BunUUIDIdGenerator(),
			);
			const email = `search-${suffix}@example.com`,
				password = "Search-test-password-123!";
			await users.save(
				User.create(
					"Search Test",
					email,
					await new BunPasswordHasher().hash(password),
					"admin",
				),
			);
			const user = await users.findByEmail(email);
			if (!user) throw new Error("Missing admin");
			userId = user.getId();
			const login = await request("/auth/login", "POST", { email, password });
			expect(login.status).toBe(200);
			const cookieName = process.env.SESSION_COOKIE_NAME ?? "session";
			cookie =
				login.headers
					.getSetCookie()
					.find((c) => c.startsWith(`${cookieName}=`))
					?.split(";")[0] ?? "";
			if (!cookie) throw new Error("Missing cookie");
			for (let i = 0; i < 3; i++) {
				const id = crypto.randomUUID(),
					code = new BunProductCodeGenerator().generate();
				ids.push(id);
				codes.push(code);
				await products.save({
					...productFake,
					id,
					code,
					name: `${suffix} Camiseta 100%_Azul`,
					status: i === 2 ? "inactive" : "active",
				});
			}
		});
		afterAll(async () => {
			if (!db) return;
			if (outfitCode)
				await request(`/outfits/${outfitCode}`, "DELETE", undefined, true);
			for (const option of options)
				await request(`/filter-options/${option}`, "DELETE", undefined, true);
			for (const id of ids) await products.remove({ id });
			if (userId) await db.query("DELETE FROM users WHERE id = $1", [userId]);
			await db.close();
		});
		it("discovers fixed fields publicly and manages choices only as admin", async () => {
			const response = await request("/search/filters");
			expect(response.status).toBe(200);
			const metadata = (await response.json()) as {
				filters: { key: string; type: string }[];
			};
			expect(metadata.filters.map((f) => f.key)).toEqual([
				"productCode",
				"outfitCode",
				"name",
				"size",
				"color",
				"marketplace",
			]);
			expect(
				(
					await request("/filter-categories/size/options", "POST", {
						name: suffix,
					})
				).status,
			).toBe(401);
			expect(
				(
					await request(
						"/filter-categories/style/options",
						"POST",
						{ name: suffix },
						true,
					)
				).status,
			).toBe(400);
			expect(
				(await request("/filter-categories", "POST", { name: "Style" }, true))
					.status,
			).toBe(404);
		});
		it("creates options and an outfit, then combines choices and text through public search", async () => {
			const sizeResponse = await request(
				"/filter-categories/size/options",
				"POST",
				{ name: `${suffix} P` },
				true,
			);
			expect(sizeResponse.status).toBe(201);
			const size = (await sizeResponse.json()) as { id: string };
			options.push(size.id);
			const colorResponse = await request(
				"/filter-categories/color/options",
				"POST",
				{ name: `${suffix} Azul` },
				true,
			);
			expect(colorResponse.status).toBe(201);
			const color = (await colorResponse.json()) as { id: string };
			options.push(color.id);
			// A read before the mutations above warms the public metadata cache.
			expect(await (await request("/search/filters")).json()).toMatchObject({
				filters: expect.arrayContaining([
					{
						key: "size",
						label: "Tamanho",
						type: "choices",
						multiple: true,
						choices: expect.arrayContaining([
							{ value: size.id, label: `${suffix} P` },
						]),
					},
				]),
			});
			for (const code of codes)
				expect(
					(
						await request(
							`/products/${code}/filter-options`,
							"PUT",
							{ optionIds: options },
							true,
						)
					).status,
				).toBe(204);
			const outfitResponse = await request(
				"/outfits",
				"POST",
				{ name: suffix, productCodes: codes },
				true,
			);
			expect(outfitResponse.status).toBe(201);
			const outfit = (await outfitResponse.json()) as { code: string };
			outfitCode = outfit.code;
			const query = new URLSearchParams({
				name: `${suffix} camiseta`,
				outfitCode: outfit.code.toLowerCase(),
				size: size.id,
				color: color.id,
				marketplace: productFake.marketplace,
			});
			const response = await request(`/search?${query}`);
			expect(response.status).toBe(200);
			const result = (await response.json()) as { items: { code: string }[] };
			expect(result.items.map((p) => p.code).sort()).toEqual(
				codes.slice(0, 2).sort(),
			);
			expect(result.items[0]).not.toHaveProperty("destinationUrl");
			expect(result.items[0]).not.toHaveProperty("id");
			const exact = await (
				await request(`/search?productCode=${codes[0]?.toLowerCase()}`)
			).json();
			expect(exact).toMatchObject({ items: [{ code: codes[0] }] });
			expect(
				await (await request(`/search?productCode=${codes[2]}`)).json(),
			).toMatchObject({ items: [] });
			expect(
				await (await request(`/search?size=${color.id}`)).json(),
			).toMatchObject({ items: [] });
			expect(
				await (
					await request(
						`/search?name=${encodeURIComponent(`${suffix} Camiseta 100%_`)}`,
					)
				).json(),
			).toMatchObject({
				items: expect.arrayContaining([
					{
						code: codes[0],
						name: `${suffix} Camiseta 100%_Azul`,
						imageUrl: productFake.imageUrl,
						marketplace: productFake.marketplace,
					},
				]),
			});
			expect((await request("/search?status=inactive")).status).toBe(400);
			expect(
				(await request(`/filter-options/${size.id}`, "DELETE", undefined, true))
					.status,
			).toBe(204);
			const after = await (await request("/search/filters")).json();
			expect(JSON.stringify(after)).not.toContain(size.id);
		});
		it("saves size/color in the product form request and restores selections for editing", async () => {
			const optionResponse = await request(
				"/filter-categories/color/options",
				"POST",
				{ name: `${suffix} New color` },
				true,
			);
			expect(optionResponse.status).toBe(201);
			const option = (await optionResponse.json()) as { id: string };
			options.push(option.id);
			const destinationUrl = `https://example.com/form-${suffix}`;
			const payload = {
				...productFake,
				name: `${suffix} Form product`,
				destinationUrl,
				optionIds: [option.id],
			};
			const invalid = await request(
				"/products",
				"POST",
				{ ...payload, optionIds: [crypto.randomUUID()] },
				true,
			);
			expect(invalid.status).toBe(400);
			expect(await products.findByDestinationUrl({ destinationUrl })).toEqual(
				[],
			);
			const created = await request("/products", "POST", payload, true);
			expect(created.status).toBe(201);
			const rows = await products.findByDestinationUrl({ destinationUrl });
			const product = rows[0];
			if (!product) throw new Error("Product missing");
			ids.push(product.id);
			expect(
				await (
					await request(
						`/products/${product.code}/filter-options`,
						"GET",
						undefined,
						true,
					)
				).json(),
			).toEqual({ optionIds: [option.id] });
			expect(
				(await request(`/products/${product.code}/filter-options`)).status,
			).toBe(401);
			const failedUpdate = await request(
				`/products/${product.code}`,
				"PUT",
				{ ...payload, name: "Rejected", optionIds: [crypto.randomUUID()] },
				true,
			);
			expect(failedUpdate.status).toBe(400);
			expect((await products.findById({ id: product.id }))?.name).toBe(
				payload.name,
			);
			expect(
				(
					await request(
						`/products/${product.code}`,
						"PUT",
						{ ...payload, optionIds: [] },
						true,
					)
				).status,
			).toBe(204);
			expect(
				await (
					await request(
						`/products/${product.code}/filter-options`,
						"GET",
						undefined,
						true,
					)
				).json(),
			).toEqual({ optionIds: [] });
		});
	},
);
