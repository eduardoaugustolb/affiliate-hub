export type StorefrontOption = { id: string; name: string };
export type ProductDetail = {
  code: string;
  name: string;
  imageUrl: string;
  imageUrls: string[];
  marketplace: "shopee" | "shein";
  destinationUrl: string;
  colors: StorefrontOption[];
  sizes: StorefrontOption[];
};
export type OutfitDetail = {
  code: string;
  name: string;
  products: ProductDetail[];
};
export const productPath = (code: string) =>
  `/products/${encodeURIComponent(code)}`;
export const outfitPath = (code: string) =>
  `/outfits/${encodeURIComponent(code)}`;
export const marketplaceName = (value: string) =>
  value === "shein" ? "Shein" : "Shopee";
