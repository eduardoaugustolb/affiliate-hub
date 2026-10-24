import type { ProductDetail } from "@/lib/storefront";
import { marketplaceName } from "@/lib/storefront";
import { ColorNavigation } from "./color-navigation";
import { MarketplaceLink } from "./marketplace-link";
import { ProductGallery } from "./product-gallery";
import { BackToCatalog } from "./store-shell";
export function ProductDetails({ product }: { product: ProductDetail }) {
  return (
    <div className="product-page">
      <BackToCatalog />
      <div className="product-layout">
        <ProductGallery
          key={JSON.stringify([product.code, product.imageUrls])}
          images={product.imageUrls}
          name={product.name}
        />
        <div className="product-info min-w-0" data-lenis-prevent>
          <div className="mb-5 flex justify-between gap-5 text-[0.65rem] uppercase tracking-[0.16em] text-muted">
            <span>Peça / {product.code}</span>
            <span>{marketplaceName(product.marketplace)}</span>
          </div>
          <h1 className="mb-8 break-words text-[clamp(2.5rem,5.8vw,6rem)] font-normal leading-[0.98] tracking-[-0.055em]">
            {product.name}
          </h1>
          <dl className="grid grid-cols-2 gap-x-5 gap-y-6 border-t border-line pt-6 text-sm">
            <div>
              <dt className="mb-2 text-xs text-muted">Marketplace</dt>
              <dd>{marketplaceName(product.marketplace)}</dd>
            </div>
            <div>
              <dt className="mb-2 text-xs text-muted">Código da peça</dt>
              <dd>{product.code}</dd>
            </div>
          </dl>
        </div>
        <div className="product-cta" data-purchase-panel>
          <MarketplaceLink product={product} />
        </div>
        <div className="product-options min-w-0 space-y-5" data-lenis-prevent>
          <dl className="text-sm">
            <dt className="mb-2 text-[0.65rem] uppercase tracking-[0.16em] text-muted">
              Tamanhos
            </dt>
            <dd className="break-words">
              {product.sizes.length
                ? product.sizes.map((size) => size.name).join(" · ")
                : "Consulte na loja"}
            </dd>
          </dl>
          {product.colors.length ? (
            <ColorNavigation
              compact
              colors={product.colors}
              title="Cores desta peça"
            />
          ) : (
            <dl className="text-sm">
              <dt className="mb-2 text-[0.65rem] uppercase tracking-[0.16em] text-muted">
                Cores
              </dt>
              <dd>Consulte na loja</dd>
            </dl>
          )}
        </div>
      </div>
      <p className="mt-4 max-w-100 text-xs leading-5 text-muted">
        Confira preço, variações e disponibilidade diretamente na{" "}
        {marketplaceName(product.marketplace)}. A compra é feita no marketplace.
      </p>
    </div>
  );
}
