import { AdminServer } from "@/components/admin/admin-server";
import { ApiBoundary } from "@/components/ui/api-boundary";

export default function AdminPage({
  searchParams,
}: PageProps<"/admin/filters">) {
  return (
    <ApiBoundary key="admin-filters">
      <AdminServer section="filters" searchParams={searchParams} />
    </ApiBoundary>
  );
}
