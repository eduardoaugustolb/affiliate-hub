import { ApiContent } from "@/components/ui/api-boundary";
import { getCatalogData } from "@/data/storefront";
import type { QueryParams } from "@/lib/query";
import { Hero } from "./hero";

export async function CatalogServer({
  searchParams,
}: {
  searchParams: Promise<QueryParams>;
}) {
  const params = await searchParams;
  const catalog = await getCatalogData(params);
  return (
    <ApiContent>
      <Hero key={JSON.stringify(params)} catalog={catalog} />
    </ApiContent>
  );
}
