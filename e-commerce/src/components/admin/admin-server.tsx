import { ApiContent } from "@/components/ui/api-boundary";
import { getAdminData } from "@/data/dashboard";
import type { QueryParams } from "@/lib/query";
import { AdminDashboard } from "./dashboard";
export async function AdminServer({
  searchParams,
  section,
}: {
  searchParams: Promise<QueryParams>;
  section: "products" | "filters" | "outfits";
}) {
  const data = await getAdminData(await searchParams, section);
  return (
    <ApiContent>
      <AdminDashboard key={section} data={data} section={section} />
    </ApiContent>
  );
}
