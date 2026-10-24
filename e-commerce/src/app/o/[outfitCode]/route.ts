import { getPublicOutfit } from "@/data/entries";
import { outfitPath } from "@/lib/storefront";
export async function GET(
  request: Request,
  { params }: { params: Promise<{ outfitCode: string }> },
) {
  const outfit = await getPublicOutfit((await params).outfitCode);
  if (!outfit) return new Response("Outfit não encontrado.", { status: 404 });
  return Response.redirect(new URL(outfitPath(outfit.code), request.url), 307);
}
