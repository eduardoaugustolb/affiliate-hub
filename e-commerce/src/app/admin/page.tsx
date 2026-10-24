import { redirect } from "next/navigation";
import { Suspense } from "react";
import { BrandLoader } from "@/components/ui/brand-loader";
import type { QueryParams } from "@/lib/query";
import { queryValue } from "@/lib/query";

async function AdminRedirect({
  searchParams,
}: {
  searchParams: Promise<QueryParams>;
}) {
  const params = await searchParams;
  const requested = queryValue(params, "tab");
  const section = ["filters", "outfits"].includes(requested)
    ? requested
    : "products";
  const query = new URLSearchParams();
  for (const key of ["offset", "edit", "outfit"]) {
    const value = queryValue(params, key);
    if (value) query.set(key, value);
  }
  redirect(`/admin/${section}${query.size ? `?${query}` : ""}`);
  return null;
}

export default function AdminPage(props: {
  searchParams: Promise<QueryParams>;
}) {
  return (
    <Suspense fallback={<BrandLoader />}>
      <AdminRedirect {...props} />
    </Suspense>
  );
}
