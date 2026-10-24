import { notFound, redirect } from "next/navigation";
import { OutfitDetails } from "@/components/storefront/outfit-detail";
import { ApiBoundary, ApiContent } from "@/components/ui/api-boundary";
import { getPublicOutfit } from "@/data/entries";
import type { QueryParams } from "@/lib/query";
import { queryValue } from "@/lib/query";
import { outfitPath } from "@/lib/storefront";

type Props = {
  params: Promise<{ id: string }>;
  searchParams: Promise<QueryParams>;
};
export async function generateMetadata({ params }: Props) {
  const outfit = await getPublicOutfit((await params).id);
  return {
    title: outfit
      ? `${outfit.name} — BLACK HEM`
      : "Outfit não encontrado — BLACK HEM",
    alternates: outfit ? { canonical: outfitPath(outfit.code) } : undefined,
  };
}
async function OutfitContent({ params, searchParams }: Props) {
  const [{ id }, query] = await Promise.all([params, searchParams]);
  const outfit = await getPublicOutfit(id);
  if (!outfit) notFound();
  if (id !== outfit.code) redirect(outfitPath(outfit.code));
  const colors = [
    ...new Map(
      outfit.products.flatMap((p) => p.colors).map((c) => [c.id, c]),
    ).values(),
  ];
  const requested = queryValue(query, "color");
  const current = colors.some((c) => c.id === requested)
    ? requested
    : undefined;
  return (
    <ApiContent>
      <OutfitDetails outfit={outfit} colors={colors} current={current} />
    </ApiContent>
  );
}
export default function Page(props: Props) {
  return (
    <ApiBoundary>
      <OutfitContent {...props} />
    </ApiBoundary>
  );
}
