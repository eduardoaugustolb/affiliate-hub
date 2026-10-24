import { searchProducts } from "@/data/catalog";
import { AdminError } from "@/lib/admin";
export async function GET(request: Request) {
  try {
    const query = new URL(request.url).searchParams;
    const filters: Record<string, string | string[]> = {};
    for (const key of query.keys())
      if (!["limit", "offset"].includes(key))
        filters[key] = query.getAll(key).join(",");
    if (query.has("limit") && query.get("limit") !== "24")
      throw new AdminError(400, "Limite inválido.");
    return Response.json(
      await searchProducts(filters, Number(query.get("offset") ?? 0)),
      { headers: { "Cache-Control": "no-store" } },
    );
  } catch (error) {
    return Response.json(
      {
        message:
          error instanceof AdminError
            ? error.message
            : "Não foi possível carregar os dados.",
      },
      { status: error instanceof AdminError ? error.status : 500 },
    );
  }
}
