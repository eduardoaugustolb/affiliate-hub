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
import { BadRequestError } from "@/application/errors/BadRequestError";
import { BunProductCodeGenerator } from "@/external/BunProductCodeGenerator";
import { BunSQLAdapter } from "@/external/database/BunSQLAdapter";
import { CatalogRepositorySQL } from "@/external/database/DAOs/CatalogRepositorySQL";
import { ProductDAOSQL } from "@/external/database/DAOs/ProductDAOSQL";

// Use a migrated, dedicated database. Never defaults to the application database.
describe.skipIf(!process.env.CATALOG_TEST_DATABASE_URL)(
	"Catalog SQL behavior with PostgreSQL",
	() => {
		let db: BunSQLAdapter;
		let catalog: CatalogRepositorySQL;
		let products: ProductDAOSQL;
		let suffix: string;
		let ids: string[];
		let codes: string[];
		beforeAll(() => {
			db = new BunSQLAdapter({
				dbUrl: process.env.CATALOG_TEST_DATABASE_URL ?? "",
			});
			catalog = new CatalogRepositorySQL(db);
			products = new ProductDAOSQL(db);
		});
		beforeEach(async () => {
			suffix = crypto.randomUUID();
			ids = [];
			codes = [];
			for (let i = 0; i < 3; i++) {
				const id = crypto.randomUUID(),
					code = new BunProductCodeGenerator().generate();
				ids.push(id);
				codes.push(code);
				await products.save({ ...productFake, id, code });
			}
		});
		afterEach(async () => {
			await db.query("DELETE FROM outfits WHERE name = $1", [suffix]);
			await db.query("DELETE FROM filter_options WHERE name LIKE $1", [
				`${suffix}%`,
			]);
			await db.query(
				"DELETE FROM products WHERE id = ANY(ARRAY(SELECT jsonb_array_elements_text($1::text::jsonb)))",
				[JSON.stringify(ids)],
			);
		});
		afterAll(async () => {
			await db.close();
		});
		async function taxonomy() {
			const size = { id: "size" },
				color = { id: "color" };
			const p = await catalog.createOption("size", `${suffix} P`),
				m = await catalog.createOption("size", `${suffix} M`),
				blue = await catalog.createOption("color", `${suffix} Azul`),
				red = await catalog.createOption("color", `${suffix} Vermelho`);
			await catalog.setProductOptions(codes[0] ?? "", [p.id, blue.id]);
			await catalog.setProductOptions(codes[1] ?? "", [m.id, blue.id]);
			await catalog.setProductOptions(codes[2] ?? "", [p.id, red.id]);
			return { size, color, p, m, blue, red };
		}
		async function list(optionIds: string[], outfitCode?: string) {
			const categories = await catalog.listCategories();
			const sizes = new Set(
				categories.find((c) => c.id === "size")?.options.map((o) => o.id),
			);
			return (
				await products.list({
					limit: 100,
					offset: 0,
					sizeIds: optionIds.filter((id) => sizes.has(id)),
					colorIds: optionIds.filter((id) => !sizes.has(id)),
					outfitCode,
				})
			)
				.map((p) => p.code)
				.sort();
		}
		it("uses OR within a category and AND between categories, before pagination", async () => {
			const { p, m, blue, red } = await taxonomy();
			expect(await list([p.id, m.id, blue.id])).toEqual(
				codes.slice(0, 2).sort(),
			);
			expect(await list([p.id, blue.id])).toEqual([codes[0] ?? ""]);
			expect(await list([p.id, red.id])).toEqual([codes[2] ?? ""]);
			expect(
				await products.list({
					limit: 1,
					offset: 1,
					sizeIds: [p.id, m.id],
					colorIds: [blue.id],
				}),
			).toHaveLength(1);
			expect(await list([crypto.randomUUID()])).toEqual([]);
			expect(await list([p.id, crypto.randomUUID()])).toEqual([]);
		});
		it("creates an outfit with a generated code and intersects its members with filters", async () => {
			const { p } = await taxonomy();
			const outfit = await catalog.createOutfit(suffix, codes.slice(0, 2));
			expect(outfit.code).toMatch(/^OUT-[A-F0-9]{16}$/);
			expect(await catalog.getOutfit(outfit.code)).toEqual({
				...outfit,
				productCodes: [...outfit.productCodes].sort(),
			});
			expect(await list([], outfit.code)).toEqual(codes.slice(0, 2).sort());
			expect(await list([p.id], outfit.code)).toEqual([codes[0] ?? ""]);
			await catalog.removeOutfit(outfit.code);
			expect(await list([], outfit.code)).toEqual([]);
		});
		it("replaces and clears product options", async () => {
			const { p, m, blue } = await taxonomy();
			await catalog.setProductOptions(codes[0] ?? "", [m.id]);
			expect(await list([p.id, blue.id])).toEqual([]);
			expect(await list([m.id])).toEqual(codes.slice(0, 2).sort());
			await catalog.setProductOptions(codes[0] ?? "", []);
			expect(await list([m.id])).toEqual([codes[1] ?? ""]);
		});
		it("rolls back an invalid option replacement preserving previous associations", async () => {
			const { p, blue } = await taxonomy();
			expect(
				catalog.setProductOptions(codes[0] ?? "", [crypto.randomUUID()]),
			).rejects.toBeInstanceOf(BadRequestError);
			expect(await list([p.id, blue.id])).toEqual([codes[0] ?? ""]);
		});
		it("rolls back outfit creation for unknown products", async () => {
			expect(
				catalog.createOutfit(suffix, [codes[0] ?? "", "UNKNOWN"]),
			).rejects.toBeInstanceOf(BadRequestError);
			expect(
				await db.query("SELECT code FROM outfits WHERE name = $1", [suffix]),
			).toEqual([]);
		});
		it("rejects duplicate options ignoring case and unknown categories", async () => {
			await catalog.createOption("color", `${suffix} Azul`);
			expect(
				catalog.createOption("color", `${suffix} azul`),
			).rejects.toBeInstanceOf(BadRequestError);
			expect(
				catalog.createOption("style", `${suffix} Azul`),
			).rejects.toBeInstanceOf(BadRequestError);
		});
		it("cascades option and product deletion without dangling references", async () => {
			const { size, p, blue } = await taxonomy();
			const outfit = await catalog.createOutfit(suffix, [codes[0] ?? ""]);
			await catalog.removeOption(p.id);
			expect(await list([p.id])).toEqual([]);

			expect(
				(await catalog.listCategories()).some((c) => c.id === size.id),
			).toBe(true);
			await products.remove({ id: ids[0] ?? "" });
			expect(await catalog.getOutfit(outfit.code)).toMatchObject({
				productCodes: [],
			});
			expect(await list([blue.id])).toEqual([codes[1] ?? ""]);
		});
		it("creates products and their options atomically, and rolls back unknown choices", async () => {
			const option = await catalog.createOption("size", `${suffix} P`),
				id = crypto.randomUUID(),
				code = new BunProductCodeGenerator().generate();
			ids.push(id);
			const row = { ...productFake, id, code };
			const error = await products
				.save(row, [crypto.randomUUID()])
				.catch((error) => error);
			expect(error).toBeInstanceOf(BadRequestError);
			expect(await products.findById({ id })).toBeUndefined();
			await products.save(row, [option.id]);
			expect(await catalog.getProductOptions(code)).toEqual([option.id]);
		});
		it("updates fields and selection together, preserves omitted options, and supports clearing", async () => {
			const { p, blue } = await taxonomy(),
				code = codes[0] ?? "",
				id = ids[0] ?? "";
			const original = await products.findById({ id });
			if (!original) throw new Error("Missing product");
			const error = await products
				.update({ ...original, name: "Changed" }, [crypto.randomUUID()])
				.catch((error) => error);
			expect(error).toBeInstanceOf(BadRequestError);
			expect((await products.findById({ id }))?.name).toBe(original.name);
			expect((await catalog.getProductOptions(code)).sort()).toEqual(
				[p.id, blue.id].sort(),
			);
			await products.update({ ...original, name: "Updated" });
			expect((await catalog.getProductOptions(code)).sort()).toEqual(
				[p.id, blue.id].sort(),
			);
			await products.update({ ...original, name: "Updated" }, []);
			expect(await catalog.getProductOptions(code)).toEqual([]);
		});
	},
);
