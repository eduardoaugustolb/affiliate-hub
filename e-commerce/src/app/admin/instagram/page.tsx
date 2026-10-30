import { AdminServer } from "@/components/admin/admin-server";
import { ApiBoundary } from "@/components/ui/api-boundary";
export default function InstagramPage({
  searchParams,
}: PageProps<"/admin/instagram">) {
  return (
    <ApiBoundary key="admin-instagram">
      <AdminServer section="instagram" searchParams={searchParams} />
    </ApiBoundary>
  );
}
