import { BrandIcon } from "@/components/ui/brand-icon";
import { GlitchText } from "@/components/ui/glitch-text";
import { marketplaceName, type ProductDetail } from "@/lib/storefront";
export function MarketplaceLink({
  product,
  compact = false,
}: {
  product: ProductDetail;
  compact?: boolean;
}) {
  return (
    <a
      href={product.destinationUrl}
      target="_blank"
      rel="sponsored noopener noreferrer"
      className={
        compact
          ? "marketplace-link marketplace-link-compact flex min-h-12 items-center justify-between gap-5 border-t border-line py-3 text-sm"
          : "marketplace-link flex min-h-16 items-center justify-between gap-4 border-y border-bone px-3 py-5 text-lg md:text-xl"
      }
    >
      <span className="relative z-10">
        <GlitchText text={`Ir para ${marketplaceName(product.marketplace)}`} />
      </span>
      <BrandIcon
        name="external-link"
        className={`marketplace-link-icon relative z-10 shrink-0 ${compact ? "size-4" : "size-5"}`}
      />
      <span className="sr-only"> — {product.name} (abre em nova aba)</span>
    </a>
  );
}
