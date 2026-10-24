import { login, logout, requireAdmin } from "@/data/auth";
import {
  createOption,
  createOutfit,
  deleteOption,
  deleteOutfit,
  getAdminFilters,
  getOutfit,
} from "@/data/catalog";
import {
  deleteProduct,
  getProduct,
  getProductOptions,
  listProducts,
  saveProduct,
  setProductOptions,
} from "@/data/products";
import { record } from "@/data/validation";
import { AdminError } from "@/lib/admin";

// Compatibility HTTP adapter. No direct transport, secrets or authorization policy.
async function handle(
  request: Request,
  context: { params: Promise<{ path: string[] }> },
) {
  const { path } = await context.params;
  const route = path.join("/");
  const method = request.method;
  const url = new URL(request.url);
  const origin = `${url.protocol}//${request.headers.get("host") ?? url.host}`;
  if (method !== "GET" && request.headers.get("origin") !== origin)
    return Response.json({ message: "Origem não permitida." }, { status: 403 });
  const json = (value: unknown, status = 200) =>
    Response.json(value, { status, headers: { "Cache-Control": "no-store" } });
  const empty = (status = 204) =>
    new Response(null, { status, headers: { "Cache-Control": "no-store" } });
  const body = async () => {
    try {
      return record(await request.json());
    } catch {
      throw new AdminError(400, "Confira os campos informados.");
    }
  };
  try {
    if (route === "auth/me" && method === "GET")
      return json(await requireAdmin());
    if (route === "auth/login" && method === "POST") {
      await login(await body());
      return empty(200);
    }
    if (route === "auth/logout" && method === "POST") {
      await logout();
      return empty(200);
    }
    if (route === "search/filters" && method === "GET")
      return json({ filters: await getAdminFilters() });
    if (route === "products" && method === "GET")
      return json(
        await listProducts(
          Number(url.searchParams.get("offset") ?? 0),
          Number(url.searchParams.get("limit") ?? 25),
        ),
      );
    if (route === "products" && method === "POST") {
      await saveProduct(null, await body());
      return empty(201);
    }
    if (path.length === 2 && path[0] === "products") {
      if (method === "GET") return json(await getProduct(path[1]));
      if (method === "PUT") {
        await saveProduct(path[1], await body());
        return empty();
      }
      if (method === "DELETE") {
        await deleteProduct(path[1]);
        return empty();
      }
    }
    if (
      path.length === 3 &&
      path[0] === "products" &&
      path[2] === "filter-options"
    ) {
      if (method === "GET")
        return json({ optionIds: await getProductOptions(path[1]) });
      if (method === "PUT") {
        await setProductOptions(path[1], (await body()).optionIds);
        return empty();
      }
    }
    if (
      path.length === 3 &&
      path[0] === "filter-categories" &&
      path[2] === "options" &&
      method === "POST"
    ) {
      await createOption(path[1], (await body()).name);
      return empty(201);
    }
    if (
      path.length === 2 &&
      path[0] === "filter-options" &&
      method === "DELETE"
    ) {
      await deleteOption(path[1]);
      return empty();
    }
    if (route === "outfits" && method === "POST")
      return json(await createOutfit(await body()), 201);
    if (path.length === 2 && path[0] === "outfits") {
      if (method === "GET") return json(await getOutfit(path[1]));
      if (method === "DELETE") {
        await deleteOutfit(path[1]);
        return empty();
      }
    }
    return empty(404);
  } catch (error) {
    return json(
      {
        message:
          error instanceof AdminError
            ? error.message
            : "Não foi possível concluir. Tente novamente.",
      },
      error instanceof AdminError ? error.status : 500,
    );
  }
}
export { handle as GET, handle as POST, handle as PUT, handle as DELETE };
