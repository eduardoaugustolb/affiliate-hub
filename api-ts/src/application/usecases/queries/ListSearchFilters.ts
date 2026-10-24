import type { CatalogService } from "@/application/CatalogService";

export class ListSearchFilters {
	constructor(private readonly catalog: CatalogService) {}
	async execute() {
		const categories = await this.catalog.listCategories();
		return {
			filters: [
				{
					key: "productCode",
					label: "Código do produto",
					type: "text",
					match: "exact",
					maxLength: 6,
				},
				{
					key: "outfitCode",
					label: "Código do outfit",
					type: "text",
					match: "exact",
					maxLength: 20,
				},
				{
					key: "name",
					label: "Nome do produto",
					type: "text",
					match: "contains",
					maxLength: 160,
				},
				...(["size", "color"] as const).map((key) => ({
					key,
					label: key === "size" ? "Tamanho" : "Cor",
					type: "choices",
					multiple: true,
					choices: (categories.find((c) => c.id === key)?.options ?? []).map(
						(o) => ({ value: o.id, label: o.name }),
					),
				})),
				{
					key: "marketplace",
					label: "Marketplace",
					type: "choices",
					multiple: false,
					choices: [
						{ value: "shopee", label: "Shopee" },
						{ value: "shein", label: "Shein" },
					],
				},
			],
		};
	}
}
