import "server-only";
import { cache } from "react";
import type { CatalogFilterValues } from "@/lib/catalog";
import { searchQuery } from "@/lib/catalog";
import { requireAdmin } from "./auth";
import { filtersDTO, outfitDTO, searchDTO } from "./dto";
import { apiJson, apiResponse, sessionHeader } from "./transport";
import {
  choice,
  identifier,
  invalid,
  outfitCode,
  pagination,
  productCode,
  record,
  text,
  values,
} from "./validation";

export const getFilters = cache(async () =>
  filtersDTO(await apiJson("search/filters")),
);
export async function searchProducts(input: CatalogFilterValues, offset = 0) {
  pagination(offset, 24);
  const filters: CatalogFilterValues = {};
  for (const [key, value] of Object.entries(record(input))) {
    if (
      ![
        "name",
        "productCode",
        "outfitCode",
        "marketplace",
        "size",
        "color",
      ].includes(key)
    )
      return invalid();
    if (value === "" || (Array.isArray(value) && !value.length)) continue;
    if (key === "size" || key === "color")
      filters[key] = values(
        Array.isArray(value)
          ? value
          : typeof value === "string"
            ? value.split(",")
            : value,
        identifier,
      );
    else if (key === "productCode") filters[key] = productCode(value);
    else if (key === "outfitCode") filters[key] = outfitCode(value);
    else if (key === "marketplace")
      filters[key] = choice(value, ["shopee", "shein"]);
    else filters[key] = text(value);
  }
  return searchDTO(await apiJson(`search?${searchQuery(filters, offset)}`));
}
export async function getAdminFilters() {
  await requireAdmin();
  return getFilters();
}
export async function createOption(category: unknown, name: unknown) {
  await requireAdmin();
  const key = choice(category, ["size", "color"]);
  await apiResponse(`filter-categories/${key}/options`, {
    method: "POST",
    body: { name: text(name) },
    session: await sessionHeader(),
  });
}
export async function deleteOption(id: unknown) {
  await requireAdmin();
  await apiResponse(`filter-options/${identifier(id)}`, {
    method: "DELETE",
    session: await sessionHeader(),
  });
}
export async function getOutfit(code: unknown) {
  await requireAdmin();
  return outfitDTO(
    await apiJson(`outfits/${outfitCode(code)}`, {
      session: await sessionHeader(),
    }),
  );
}
export async function createOutfit(input: unknown) {
  await requireAdmin();
  const data = record(input);
  const outfit = outfitDTO(
    await apiJson("outfits", {
      method: "POST",
      body: {
        name: text(data.name),
        productCodes: values(data.productCodes, productCode, false),
      },
      session: await sessionHeader(),
    }),
  );
  return { code: outfit.code };
}
export async function deleteOutfit(code: unknown) {
  await requireAdmin();
  await apiResponse(`outfits/${outfitCode(code)}`, {
    method: "DELETE",
    session: await sessionHeader(),
  });
}
