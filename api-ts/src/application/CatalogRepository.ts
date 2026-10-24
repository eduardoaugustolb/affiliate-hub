export type FilterCategory = {
	id: "size" | "color";
	name: string;
	options: { id: string; name: string }[];
};
export type Outfit = { code: string; name: string; productCodes: string[] };
export interface CatalogRepository {
	listCategories(): Promise<FilterCategory[]>;
	createOption(
		categoryId: string,
		name: string,
	): Promise<{ id: string; name: string }>;
	removeOption(id: string): Promise<void>;
	getProductOptions(code: string): Promise<string[]>;
	setProductOptions(code: string, optionIds: string[]): Promise<void>;
	createOutfit(name: string, productCodes: string[]): Promise<Outfit>;
	getOutfit(code: string): Promise<Outfit>;
	removeOutfit(code: string): Promise<void>;
}
