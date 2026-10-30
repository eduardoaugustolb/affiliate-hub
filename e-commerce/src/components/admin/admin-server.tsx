import { ApiContent } from "@/components/ui/api-boundary";
import { getAdminData } from "@/data/dashboard";
import { getInstagramData } from "@/data/instagram";
import type { QueryParams } from "@/lib/query";
import { AdminDashboard } from "./dashboard";
export async function AdminServer({
  searchParams,
  section,
}: {
  searchParams: Promise<QueryParams>;
  section: "products" | "filters" | "outfits" | "instagram";
}) {
  const data = await getAdminData(await searchParams, section);
  const instagram =
    section === "instagram" && data.user ? await getInstagramData() : undefined;
  return (
    <ApiContent>
      <AdminDashboard
        key={section}
        data={data}
        section={section}
        instagram={instagram}
      />
    </ApiContent>
  );
}
