import "server-only";
import { cache } from "react";
import { AdminError } from "@/lib/admin";
import type {
  OutfitDetail,
  ProductDetail,
  StorefrontOption,
} from "@/lib/storefront";
import { apiJson } from "./transport";
import {
  choice,
  httpsUrl,
  identifier,
  invalid,
  outfitCode,
  productCode,
  productImages,
  record,
  text,
} from "./validation";

function optionsDTO(input: unknown): StorefrontOption[] {
  if (!Array.isArray(input) || input.length > 100) return invalid();
  return input.map((value) => {
    const item = record(value);
    return { id: identifier(item.id), name: text(item.name) };
  });
}
export function productDetailDTO(input: unknown): ProductDetail {
  const item = record(input);
  const imageUrls = productImages(item.imageUrls, item.imageUrl);
  return {
    code: productCode(item.code),
    name: text(item.name),
    imageUrl: imageUrls[0],
    imageUrls,
    destinationUrl: httpsUrl(item.destinationUrl),
    marketplace: choice(item.marketplace, ["shopee", "shein"]),
    colors: optionsDTO(item.colors),
    sizes: optionsDTO(item.sizes),
  };
}
async function publicEntry<T>(load: () => Promise<T>): Promise<T | null> {
  try {
    return await load();
  } catch (error) {
    if (error instanceof AdminError && [400, 404, 410].includes(error.status))
      return null;
    throw error;
  }
}
export const getPublicProduct = cache((input: string) =>
  publicEntry(async () =>
    productDetailDTO(
      await apiJson(`storefront/products/${productCode(input)}`),
    ),
  ),
);
export const getPublicOutfit = cache((input: string) =>
  publicEntry(async (): Promise<OutfitDetail> => {
    const item = record(
      await apiJson(`storefront/outfits/${outfitCode(input)}`),
    );
    if (!Array.isArray(item.products) || item.products.length > 100)
      return invalid();
    return {
      code: outfitCode(item.code),
      name: text(item.name),
      products: item.products.map(productDetailDTO),
    };
  }),
);
