export type CatalogFilter = {
  key: string;
  label: string;
} & (
  | { type: "text"; match: "exact" | "contains"; maxLength: number }
  | {
      type: "choices";
      multiple: boolean;
      choices: { value: string; label: string }[];
    }
);

export type CatalogFilterValues = Record<string, string | string[]>;
export type CatalogProduct = {
  code: string;
  name: string;
  imageUrl: string;
  marketplace: string;
};
export type SearchResult = {
  items: CatalogProduct[];
  limit: number;
  offset: number;
  hasMore: boolean;
};

export function searchQuery(filters: CatalogFilterValues, offset = 0) {
  const query = new URLSearchParams({ limit: "24", offset: String(offset) });
  for (const [key, value] of Object.entries(filters)) {
    const normalized = Array.isArray(value) ? value.join(",") : value.trim();
    if (normalized) query.set(key, normalized);
  }
  return query.toString();
}

export type CatalogData = {
  fields: CatalogFilter[];
  filters: CatalogFilterValues;
  result: SearchResult;
  error: string;
  filtersError: string;
};
