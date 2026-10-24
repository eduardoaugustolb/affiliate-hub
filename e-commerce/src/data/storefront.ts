import "server-only";
import { AdminError } from "@/lib/admin";
import type { CatalogData, CatalogFilterValues } from "@/lib/catalog";
import { pageOffset, type QueryParams, queryValue } from "@/lib/query";
import { getFilters, searchProducts } from "./catalog";

export async function getCatalogData(
  params: QueryParams,
): Promise<CatalogData> {
  const filters: CatalogFilterValues = {};
  for (const key of [
    "name",
    "productCode",
    "outfitCode",
    "marketplace",
    "size",
    "color",
  ]) {
    const value = params[key];
    if (value) {
      const normalized = Array.isArray(value) ? value.join(",") : value;
      filters[key] =
        key === "size" || key === "color"
          ? normalized.split(",").filter(Boolean)
          : normalized;
    }
  }
  const offset = pageOffset(queryValue(params, "offset"), 24);
  const [metadata, result] = await Promise.allSettled([
    getFilters(),
    searchProducts(filters, offset),
  ]);
  return {
    fields: metadata.status === "fulfilled" ? metadata.value : [],
    filters,
    result:
      result.status === "fulfilled"
        ? result.value
        : { items: [], limit: 24, offset, hasMore: false },
    error:
      result.status === "rejected"
        ? result.reason instanceof AdminError
          ? result.reason.message
          : "Não foi possível buscar as peças."
        : "",
    filtersError:
      metadata.status === "rejected"
        ? "Não foi possível carregar os filtros."
        : "",
  };
}
