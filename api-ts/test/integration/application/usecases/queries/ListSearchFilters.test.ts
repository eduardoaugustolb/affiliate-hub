import { expect, it } from "bun:test";
import { authenticatedSession } from "@test/support/fixtures/authenticatedSession";
import { catalogRepository } from "@test/support/fixtures/catalogRepository";
import { CatalogService } from "@/application/CatalogService";
import { ListSearchFilters } from "@/application/usecases/queries/ListSearchFilters";

it("exposes exactly six fixed filters, with text behavior and editable size/color choices", async () => {
	const { repository, categories } = catalogRepository();
	categories[0]?.options.push({ id: "p", name: "P" });
	const { authenticator } = await authenticatedSession();
	const { filters } = await new ListSearchFilters(
		new CatalogService(repository, authenticator),
	).execute();
	expect(filters.map((f) => f.key)).toEqual([
		"productCode",
		"outfitCode",
		"name",
		"size",
		"color",
		"marketplace",
	]);
	expect(filters[0]).toMatchObject({ type: "text", match: "exact" });
	expect(filters[2]).toMatchObject({ type: "text", match: "contains" });
	expect(filters[3]).toMatchObject({
		type: "choices",
		multiple: true,
		choices: [{ value: "p", label: "P" }],
	});
	expect(filters[4]).toMatchObject({ choices: [] });
	expect(filters[5]).toMatchObject({
		multiple: false,
		choices: [
			{ value: "shopee", label: "Shopee" },
			{ value: "shein", label: "Shein" },
		],
	});
});
