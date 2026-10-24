import { notFound, redirect } from "next/navigation";
import { ProductDetails } from "@/components/storefront/product-detail";
import { ApiBoundary, ApiContent } from "@/components/ui/api-boundary";
import { getPublicProduct } from "@/data/entries";
import { productPath } from "@/lib/storefront";

type Props = { params: Promise<{ id: string }> };
export async function generateMetadata({ params }: Props) {
  const product = await getPublicProduct((await params).id);
  return {
    title: product
      ? `${product.name} — BLACK HEM`
      : "Peça não encontrada — BLACK HEM",
    alternates: product ? { canonical: productPath(product.code) } : undefined,
  };
}
async function ProductContent({ params }: Props) {
  const { id } = await params;
  const product = await getPublicProduct(id);
  if (!product) notFound();
  if (id !== product.code) redirect(productPath(product.code));
  return (
    <ApiContent>
      <ProductDetails product={product} />
    </ApiContent>
  );
}
export default function Page(props: Props) {
  return (
    <ApiBoundary>
      <ProductContent {...props} />
    </ApiBoundary>
  );
}
