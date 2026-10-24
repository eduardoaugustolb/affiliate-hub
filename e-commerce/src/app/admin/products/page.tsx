import { AdminServer } from "@/components/admin/admin-server";
import { ApiBoundary } from "@/components/ui/api-boundary";

export default function AdminPage({
  searchParams,
}: PageProps<"/admin/products">) {
  return (
    <ApiBoundary key="admin-products">
      <AdminServer section="products" searchParams={searchParams} />
    </ApiBoundary>
  );
}
