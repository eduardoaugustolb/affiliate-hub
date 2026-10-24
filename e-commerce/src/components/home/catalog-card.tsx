"use client";
import Link from "next/link";
import { useCallback, useId, useRef } from "react";
import { Reveal } from "@/components/ui/reveal";
import { Skeleton } from "@/components/ui/skeleton";
import type { CatalogProduct } from "@/lib/catalog";
import { productPath } from "@/lib/storefront";
import { useHeroStage } from "./hero-intro";
import { useProductClarity } from "./use-product-clarity";

export function CatalogCard({
  product,
  index = 0,
}: {
  product?: CatalogProduct;
  index?: number;
}) {
  const root = useRef<HTMLDivElement>(null);
  const filterId = `product-clarity-${useId().replace(/[^a-z0-9_-]/gi, "")}`;
  useProductClarity(root, filterId);
  const { controlsComplete, finishProduct } = useHeroStage();
  const code = product?.code;
  const reportComplete = useCallback(() => {
    if (code) finishProduct(code);
  }, [code, finishProduct]);
  const imageClass =
    "relative aspect-[4/5] overflow-hidden bg-surface md:aspect-[5/6]";
  if (!product)
    return (
      <figure className="min-w-0" aria-hidden="true">
        <div className={imageClass}>
          <Skeleton className="size-full" />
        </div>
        <figcaption className="catalog-product-caption">
          <Skeleton className="h-5 w-4/5" />
          <Skeleton className="h-3 w-2/5" />
        </figcaption>
      </figure>
    );
  return (
    <Reveal
      as="figure"
      containerRef={root}
      data-catalog-card
      className="catalog-card min-w-0"
      ready={controlsComplete}
      onRevealComplete={reportComplete}
      delay={Math.min(index % 4, 3) * 0.05}
    >
      <svg
        className="pointer-events-none absolute size-0"
        aria-hidden="true"
        focusable="false"
      >
        <title>Filtro decorativo</title>
        <defs>
          <filter
            id={filterId}
            x="-5%"
            y="-5%"
            width="110%"
            height="110%"
            colorInterpolationFilters="sRGB"
          >
            <feTurbulence
              type="fractalNoise"
              baseFrequency="0.08 0.45"
              numOctaves={1}
              seed={1}
              result="jitter"
            />
            <feDisplacementMap
              in="SourceGraphic"
              in2="jitter"
              scale={0}
              xChannelSelector="R"
              yChannelSelector="G"
            />
          </filter>
        </defs>
      </svg>
      <Link
        href={productPath(product.code)}
        data-product-link
        className={`${imageClass} block w-full cursor-pointer text-left`}
        aria-label={`Ver detalhes de ${product.name}`}
      >
        {/* biome-ignore lint/performance/noImgElement: Marketplace image origins are arbitrary. */}
        <img
          data-image="front"
          src={product.imageUrl}
          alt={product.name}
          loading={index < 4 ? "eager" : "lazy"}
          draggable={false}
          className="size-full object-cover"
        />
        {/* Keep hover geometry separate from GSAP's temporary jitter transforms. */}
        <span
          data-image="back"
          aria-hidden="true"
          className="pointer-events-none absolute inset-0 block"
        >
          {/* The API provides one image: reuse it for the reveal. */}
          {/* biome-ignore lint/performance/noImgElement: Marketplace image origins are arbitrary. */}
          <img
            data-clarity-image
            src={product.imageUrl}
            alt=""
            loading={index < 4 ? "eager" : "lazy"}
            draggable={false}
            className="size-full object-cover"
          />
        </span>
        <span
          data-card-grain
          aria-hidden="true"
          className="catalog-card-grain pointer-events-none absolute inset-0 opacity-0"
        />
      </Link>
      <figcaption className="catalog-product-caption">
        <span className="truncate text-sm" title={product.name}>
          {product.name}
        </span>
        <span className="text-[0.65rem] text-muted">
          {product.marketplace} · {product.code}
        </span>
      </figcaption>
    </Reveal>
  );
}
