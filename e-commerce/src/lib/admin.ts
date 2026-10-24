export type AdminUser = {
  name: string;
};
export type Product = {
  code: string;
  name: string;
  marketplace: string;
  destinationUrl: string;
  imageUrl: string;
  imageUrls: string[];
  status: string;
};
export class AdminError extends Error {
  constructor(
    public status: number,
    message: string,
  ) {
    super(message);
  }
}
export type ActionResult<T> =
  | { ok: true; value: T }
  | { ok: false; status: number; message: string };
export async function actionRequest<T>(
  pending: Promise<ActionResult<T>>,
): Promise<T> {
  const result = await pending;
  if (!result.ok) throw new AdminError(result.status, result.message);
  return result.value;
}

export type Outfit = { code: string; name: string; productCodes: string[] };
export type AdminData = {
  user: AdminUser | null;
  products: Product[];
  filters: import("./catalog").CatalogFilter[];
  outfit: Outfit | null;
  editor: Product | "new" | null;
  optionIds: string[];
  offset: number;
  error: string;
};
