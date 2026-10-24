import { mock } from "bun:test";
import type {
	CatalogRepository,
	FilterCategory,
} from "@/application/CatalogRepository";

export function catalogRepository() {
	const categories: FilterCategory[] = [
		{ id: "size", name: "Tamanho", options: [] },
		{ id: "color", name: "Cor", options: [] },
	];
	const repository = {
		listCategories: mock(async () => categories),
		createOption: mock(async (_id: string, name: string) => ({
			id: "option",
			name,
		})),
		removeOption: mock(async (_id: string) => {}),
		getProductOptions: mock(async (_code: string) => [] as string[]),
		setProductOptions: mock(async (_code: string, _ids: string[]) => {}),
		createOutfit: mock(async (name: string, productCodes: string[]) => ({
			code: "OUT-AAAAAAAAAAAAAAAA",
			name,
			productCodes,
		})),
		getOutfit: mock(async (code: string) => ({
			code,
			name: "Look",
			productCodes: ["ABCD"],
		})),
		removeOutfit: mock(async (_code: string) => {}),
	} satisfies CatalogRepository;
	return { repository, categories };
}
