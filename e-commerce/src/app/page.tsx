import { CatalogServer } from "@/components/home/catalog-server";
import { ApiBoundary } from "@/components/ui/api-boundary";

export default function Home({ searchParams }: PageProps<"/">) {
  return (
    <ApiBoundary>
      <CatalogServer searchParams={searchParams} />
    </ApiBoundary>
  );
}
