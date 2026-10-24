import "server-only";
import { requireAdmin } from "./auth";
import { productDTO } from "./dto";
import { apiJson, apiResponse, sessionHeader } from "./transport";
import {
  choice,
  httpsUrl,
  identifier,
  invalid,
  pagination,
  productCode,
  productImages,
  record,
  text,
  values,
} from "./validation";

export async function listProducts(offset = 0, limit = 25) {
  await requireAdmin();
  const page = pagination(offset, limit);
  const result = await apiJson(
    `products?limit=${page.limit}&offset=${page.offset}`,
    { session: await sessionHeader() },
  );
  if (!Array.isArray(result) || result.length > limit) return invalid();
  return result.map(productDTO);
}
export async function getProduct(code: unknown) {
  await requireAdmin();
  return productDTO(
    await apiJson(`products/${productCode(code)}`, {
      session: await sessionHeader(),
    }),
  );
}
export async function getProductOptions(code: unknown) {
  await requireAdmin();
  const data = record(
    await apiJson(`products/${productCode(code)}/filter-options`, {
      session: await sessionHeader(),
    }),
  );
  return values(data.optionIds, identifier);
}
export async function saveProduct(code: unknown, input: unknown) {
  await requireAdmin();
  const data = record(input);
  const imageUrls = productImages(data.imageUrls, data.imageUrl);
  const body = {
    name: text(data.name),
    marketplace: choice(data.marketplace, ["shopee", "shein"]),
    destinationUrl: httpsUrl(data.destinationUrl),
    imageUrl: imageUrls[0],
    imageUrls,
    status: choice(data.status, ["active", "inactive"]),
    optionIds: values(data.optionIds, identifier),
  };
  const path = code === null ? "products" : `products/${productCode(code)}`;
  await apiResponse(path, {
    method: code === null ? "POST" : "PUT",
    body,
    session: await sessionHeader(),
  });
}
export async function deleteProduct(code: unknown) {
  await requireAdmin();
  await apiResponse(`products/${productCode(code)}`, {
    method: "DELETE",
    session: await sessionHeader(),
  });
}
export async function setProductOptions(code: unknown, input: unknown) {
  await requireAdmin();
  await apiResponse(`products/${productCode(code)}/filter-options`, {
    method: "PUT",
    body: { optionIds: values(input, identifier) },
    session: await sessionHeader(),
  });
}
