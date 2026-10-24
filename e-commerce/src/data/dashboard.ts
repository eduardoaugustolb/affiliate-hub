import "server-only";
import { type AdminData, AdminError } from "@/lib/admin";
import { pageOffset, type QueryParams, queryValue } from "@/lib/query";
import { requireAdmin } from "./auth";
import { getAdminFilters, getOutfit } from "./catalog";
import { getProduct, getProductOptions, listProducts } from "./products";

export async function getAdminData(
  params: QueryParams,
  tab: "products" | "filters" | "outfits" | "instagram",
): Promise<AdminData> {
  const offset = pageOffset(queryValue(params, "offset"), 25);
  const data: AdminData = {
    user: null,
    products: [],
    filters: [],
    outfit: null,
    editor: null,
    optionIds: [],
    offset,
    error: "",
  };
  try {
    data.user = await requireAdmin();
  } catch (error) {
    if (!(error instanceof AdminError && error.status === 401))
      data.error =
        error instanceof AdminError
          ? error.message
          : "Não foi possível verificar a sessão.";
    return data;
  }
  const editing = queryValue(params, "edit");
  const outfit = queryValue(params, "outfit");
  const reads: Promise<void>[] = [];
  if (tab === "products")
    reads.push(
      listProducts(offset).then((value) => {
        data.products = value;
      }),
    );
  if (tab === "filters" || (tab === "products" && editing))
    reads.push(
      getAdminFilters().then((value) => {
        data.filters = value;
      }),
    );
  if (tab === "products" && editing === "new") data.editor = "new";
  else if (tab === "products" && editing)
    reads.push(
      Promise.all([getProduct(editing), getProductOptions(editing)]).then(
        ([product, options]) => {
          data.editor = product;
          data.optionIds = options;
        },
      ),
    );
  if (tab === "outfits" && outfit)
    reads.push(
      getOutfit(outfit).then((value) => {
        data.outfit = value;
      }),
    );
  const results = await Promise.allSettled(reads);
  for (const result of results)
    if (result.status === "rejected") {
      if (
        result.reason instanceof AdminError &&
        [401, 403].includes(result.reason.status)
      )
        return {
          ...data,
          user: null,
          products: [],
          filters: [],
          editor: null,
          outfit: null,
          optionIds: [],
          error: result.reason.message,
        };
      data.editor = null;
      data.error =
        result.reason instanceof AdminError
          ? result.reason.message
          : "Não foi possível carregar os dados.";
    }
  return data;
}
