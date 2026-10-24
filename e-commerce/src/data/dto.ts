import "server-only";
import type { Outfit, Product } from "@/lib/admin";
import type {
  CatalogFilter,
  CatalogProduct,
  SearchResult,
} from "@/lib/catalog";
import {
  choice,
  httpsUrl,
  identifier,
  invalid,
  outfitCode,
  pagination,
  productCode,
  productImages,
  record,
  text,
  values,
} from "./validation";

export function productDTO(input: unknown): Product {
  const item = record(input);
  const imageUrls = productImages(item.imageUrls, item.imageUrl);
  return {
    code: productCode(item.code),
    name: text(item.name),
    marketplace: choice(item.marketplace, ["shopee", "shein"]),
    destinationUrl: httpsUrl(item.destinationUrl),
    imageUrl: imageUrls[0],
    imageUrls,
    status: choice(item.status, ["active", "inactive"]),
  };
}
export function publicProductDTO(input: unknown): CatalogProduct {
  const item = record(input);
  return {
    code: productCode(item.code),
    name: text(item.name),
    marketplace: choice(item.marketplace, ["shopee", "shein"]),
    imageUrl: httpsUrl(item.imageUrl),
  };
}
export function outfitDTO(input: unknown): Outfit {
  const item = record(input);
  return {
    code: outfitCode(item.code),
    name: text(item.name),
    productCodes: values(item.productCodes, productCode),
  };
}
export function filtersDTO(input: unknown): CatalogFilter[] {
  const { filters } = record(input);
  if (!Array.isArray(filters) || filters.length > 20) return invalid();
  return filters.map((value) => {
    const item = record(value);
    const key = choice(item.key, [
      "name",
      "productCode",
      "outfitCode",
      "marketplace",
      "size",
      "color",
    ]);
    const label = text(item.label);
    if (item.type === "text") {
      if (
        typeof item.maxLength !== "number" ||
        !Number.isInteger(item.maxLength) ||
        item.maxLength < 1 ||
        item.maxLength > 160
      )
        return invalid();
      return {
        key,
        label,
        type: "text",
        match: choice(item.match, ["exact", "contains"]),
        maxLength: item.maxLength,
      };
    }
    if (
      item.type !== "choices" ||
      typeof item.multiple !== "boolean" ||
      !Array.isArray(item.choices) ||
      item.choices.length > 1000
    )
      return invalid();
    return {
      key,
      label,
      type: "choices",
      multiple: item.multiple,
      choices: item.choices.map((value) => {
        const option = record(value);
        return { value: identifier(option.value), label: text(option.label) };
      }),
    };
  });
}
export function searchDTO(input: unknown): SearchResult {
  const result = record(input);
  const page = pagination(result.offset, result.limit);
  if (
    !Array.isArray(result.items) ||
    result.items.length > page.limit ||
    typeof result.hasMore !== "boolean"
  )
    return invalid();
  return {
    ...page,
    items: result.items.map(publicProductDTO),
    hasMore: result.hasMore,
  };
}
