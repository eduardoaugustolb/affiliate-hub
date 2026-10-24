import { describe, expect, it, spyOn } from "bun:test";
import { ProductDAOFake } from "@test/support/fakes/ProductDAOFake";
import { authenticatedSession } from "@test/support/fixtures/authenticatedSession";
import { catalogRepository } from "@test/support/fixtures/catalogRepository";
import { productRow } from "@test/support/fixtures/productRow";
import { CatalogService } from "@/application/CatalogService";
import { ListSearchFilters } from "@/application/usecases/queries/ListSearchFilters";
import { SearchProducts } from "@/application/usecases/queries/SearchProducts";
import { HonoHttpServerAdapter } from "@/external/http/HonoHttpServerAdapter";
import { SearchRestController } from "@/infra/controllers/http/SearchRestController";
import type { FetchHandler } from "@/infra/http/HttpRestRuntime";

async function setup() {
	const { authenticator } = await authenticatedSession(),
		{ repository } = catalogRepository(),
		dao = new ProductDAOFake();
	const list = spyOn(dao, "list").mockResolvedValue([productRow]);
	let handler: FetchHandler | undefined;
	const server = new HonoHttpServerAdapter({
		serve: async (h) => {
			handler = h;
			return { port: 0, stop: async () => {} };
		},
	});
	new SearchRestController(
		server,
		new SearchProducts(dao),
		new ListSearchFilters(new CatalogService(repository, authenticator)),
	);
	await server.listen(0);
	const request = async (path: string) => {
		if (!handler) throw new Error("Missing handler");
		return handler(new Request(`http://localhost${path}`));
	};
	return { request, list };
}
describe("SearchRestController", () => {
	it("lists filter metadata publicly without credentials", async () => {
		const { request } = await setup();
		const r = await request("/search/filters");
		expect(r.status).toBe(200);
		expect(await r.json()).toMatchObject({
			filters: expect.arrayContaining([
				{
					key: expect.any(String),
					label: expect.any(String),
					type: expect.any(String),
					match: expect.any(String),
					maxLength: expect.any(Number),
				},
			]),
		});
	});
	it("searches publicly and parses choices and pagination", async () => {
		const { request, list } = await setup(),
			size = crypto.randomUUID(),
			color = crypto.randomUUID();
		const r = await request(
			`/search?name=Camiseta&size=${size}&color=${color}&productCode=abcd&outfitCode=OUT-AAAAAAAAAAAAAAAA&marketplace=shein&limit=5&offset=2`,
		);
		expect(r.status).toBe(200);
		expect(list).toHaveBeenCalledWith({
			activeOnly: true,
			limit: 6,
			offset: 2,
			productCode: "ABCD",
			outfitCode: "OUT-AAAAAAAAAAAAAAAA",
			marketplace: "shein",
			name: "Camiseta",
			sizeIds: [size],
			colorIds: [color],
		});
		expect(await r.json()).toMatchObject({
			items: [{ code: productRow.code }],
			limit: 5,
			offset: 2,
		});
	});
	it.each([
		"status=inactive",
		"activeOnly=false",
		"unknown=value",
		"limit=0",
		"size=",
		"color=unknown",
		"marketplace=other",
		"name=",
	])("rejects unsupported or invalid filters %s", async (query) => {
		const { request, list } = await setup();
		expect((await request(`/search?${query}`)).status).toBe(400);
		expect(list).not.toHaveBeenCalled();
	});
});
