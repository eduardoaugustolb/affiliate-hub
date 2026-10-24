import { getFilters } from "@/data/catalog";
import { AdminError } from "@/lib/admin";
export async function GET() {
  try {
    return Response.json(
      { filters: await getFilters() },
      { headers: { "Cache-Control": "no-store" } },
    );
  } catch (error) {
    return Response.json(
      { message: "Não foi possível carregar os filtros." },
      { status: error instanceof AdminError ? error.status : 500 },
    );
  }
}
