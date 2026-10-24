import type { FilterCategory } from "./CatalogRepository";
export interface CatalogCache {
	read(load: () => Promise<FilterCategory[]>): Promise<FilterCategory[]>;
	invalidate(): Promise<void>;
}
