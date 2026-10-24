import { getPublicProduct } from "@/data/entries";
import { productPath } from "@/lib/storefront";
export async function GET(
  request: Request,
  { params }: { params: Promise<{ productCode: string }> },
) {
  const product = await getPublicProduct((await params).productCode);
  if (!product) return new Response("Peça não encontrada.", { status: 404 });
  return Response.redirect(
    new URL(productPath(product.code), request.url),
    307,
  );
}
