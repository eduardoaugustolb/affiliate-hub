import Link from "next/link";
import type { OutfitDetail, StorefrontOption } from "@/lib/storefront";
import { productPath } from "@/lib/storefront";
import { ColorNavigation } from "./color-navigation";
import { MarketplaceLink } from "./marketplace-link";
import { BackToCatalog } from "./store-shell";
export function OutfitDetails({
  outfit,
  colors,
  current,
}: {
  outfit: OutfitDetail;
  colors: StorefrontOption[];
  current?: string;
}) {
  const products = current
    ? outfit.products.filter((p) => p.colors.some((c) => c.id === current))
    : outfit.products;
  return (
    <>
      <BackToCatalog />
      <div className="mb-8 grid gap-6 border-b border-line pb-9 lg:grid-cols-[minmax(0,1fr)_20rem] lg:items-end">
        <div>
          <p className="mb-5 text-[0.65rem] uppercase tracking-[0.16em] text-muted">
            Outfit / {outfit.code}
          </p>
          <h1 className="max-w-5xl break-words text-[clamp(2.8rem,7vw,8rem)] leading-[0.98] tracking-[-0.055em]">
            {outfit.name}
          </h1>
        </div>
        <p className="max-w-80 text-sm leading-6 text-muted">
          Um look, peça por peça. Explore os detalhes e encontre cada item no
          seu marketplace.
        </p>
      </div>
      <ColorNavigation
        colors={colors}
        current={current}
        basePath={`/outfits/${outfit.code}`}
        outfit
      />
      <p className="mb-7 text-xs text-muted" aria-live="polite">
        {products.length} {products.length === 1 ? "peça" : "peças"}
        {current ? " nesta cor" : " neste outfit"}
      </p>
      <div className="grid grid-cols-1 gap-x-6 gap-y-10 sm:grid-cols-2 lg:grid-cols-3">
        {products.map((product, index) => (
          <article key={product.code} className="min-w-0">
            <Link href={productPath(product.code)} className="group block">
              <div className="overflow-hidden bg-surface">
                {/* biome-ignore lint/performance/noImgElement: Marketplace image origins are arbitrary. */}
                <img
                  src={product.imageUrl}
                  alt={product.name}
                  loading={index < 3 ? "eager" : "lazy"}
                  className="aspect-[4/5] w-full object-contain motion-safe:transition-transform motion-safe:duration-500 group-hover:scale-[1.03]"
                />
              </div>
              <div className="flex items-start justify-between gap-4 py-5">
                <h2 className="text-lg tracking-tight">{product.name}</h2>
                <span className="pt-1 text-[0.6rem] text-muted">
                  {product.code}
                </span>
              </div>
            </Link>
            <MarketplaceLink product={product} compact />
          </article>
        ))}
      </div>
      {!products.length && (
        <div className="border-y border-line py-14">
          <p className="mb-4 text-muted">
            {current
              ? "Nenhuma peça deste outfit nesta cor."
              : "Este outfit ainda não tem peças disponíveis."}
          </p>
          <Link
            href={`/outfits/${outfit.code}`}
            className="text-sm underline underline-offset-4"
          >
            Ver outfit completo
          </Link>
        </div>
      )}
    </>
  );
}
