import { AdminServer } from "@/components/admin/admin-server";
import { ApiBoundary } from "@/components/ui/api-boundary";

export default function AdminPage({
  searchParams,
}: PageProps<"/admin/outfits">) {
  return (
    <ApiBoundary key="admin-outfits">
      <AdminServer section="outfits" searchParams={searchParams} />
    </ApiBoundary>
  );
}
