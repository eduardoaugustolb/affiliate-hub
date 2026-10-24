"use client";
import { useGSAP } from "@gsap/react";
import gsap from "gsap";
import { useRef } from "react";
import { BrandIcon } from "@/components/ui/brand-icon";
import { useHeroEntrance } from "./hero-reveal";
import { type ProductKind, ProductPlaceholder } from "./product-placeholder";

gsap.registerPlugin(useGSAP);

export type ProductPreviewData = {
  id: string;
  code: string;
  color: "preto" | "cinza";
  name: string;
  kind: ProductKind;
  light: boolean;
  surface: string;
};

export function ProductPreview({
  product,
  compact = false,
  entranceOrder,
  hidden = false,
}: {
  product: ProductPreviewData;
  compact?: boolean;
  entranceOrder?: number;
  hidden?: boolean;
}) {
  const ref = useRef<HTMLElement>(null);
  useHeroEntrance(ref, entranceOrder);
  useGSAP(
    (_, contextSafe) => {
      if (!contextSafe) return;
      const media = gsap.matchMedia();
      media.add(
        {
          reduced: "(prefers-reduced-motion: reduce)",
          motion: "(prefers-reduced-motion: no-preference)",
        },
        (context) => {
          const reduced = Boolean(context.conditions?.reduced);
          const removeListeners: (() => void)[] = [];
          const listen = (
            element: Element,
            event: string,
            callback: () => void,
          ) => {
            const handler = contextSafe(callback);
            element.addEventListener(event, handler);
            removeListeners.push(() =>
              element.removeEventListener(event, handler),
            );
          };
          const figure = ref.current;
          if (!figure) return;
          const details = figure.querySelector("details");
          const summary = figure.querySelector("summary");
          if (!details || !summary) return;
          let hovered = false;
          const update = () => {
            const focused = figure.contains(document.activeElement);
            const expanded = details.open || hovered || focused;
            const options = {
              duration: reduced ? 0 : 0.4,
              ease: "power3.out",
              overwrite: true,
            };
            gsap.to(figure.querySelector("[data-product-action]"), {
              backgroundColor: expanded ? "#080808" : "rgba(236,233,226,0.9)",
              color: expanded ? "#ece9e2" : "#080808",
              ...options,
            });
            gsap.to(figure.querySelector("[data-product-detail]"), {
              clipPath: expanded
                ? "inset(0% 0% 0% 0%)"
                : "inset(0% 100% 0% 0%)",
              ...options,
            });
            gsap.to(figure.querySelector("[data-product-base]"), {
              scale: expanded ? 0.97 : 1,
              ...options,
            });
            gsap.to(figure.querySelector("[data-product-zoom]"), {
              scale: expanded ? 1 : 1.15,
              ...options,
            });
            gsap.to(figure.querySelector("[data-product-underline]"), {
              scaleX: hovered || focused ? 1 : 0,
              ...options,
            });
          };
          listen(figure, "pointerenter", () => {
            hovered = matchMedia("(hover: hover)").matches;
            update();
          });
          listen(figure, "pointerleave", () => {
            hovered = false;
            update();
          });
          listen(figure, "focusin", update);
          listen(figure, "focusout", update);
          listen(details, "toggle", update);
          return () => {
            for (const remove of removeListeners) remove();
          };
        },
      );
      return () => media.revert();
    },
    { scope: ref },
  );

  return (
    <figure
      ref={ref}
      hidden={hidden}
      data-hero-reveal={entranceOrder !== undefined ? "" : undefined}
      className="group/card min-w-0"
    >
      <details className="group/view">
        <summary
          aria-label={`Alternar detalhe de ${product.name.toLowerCase()} — imagem provisória`}
          className={`relative block cursor-pointer list-none overflow-hidden [&::-webkit-details-marker]:hidden ${product.surface} ${compact ? "aspect-square" : "aspect-[4/5] md:aspect-[5/6]"}`}
        >
          <div
            aria-hidden="true"
            className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_40%_20%,#ffffff35,transparent_65%)]"
          />
          <div data-product-image className="absolute inset-[5%]">
            <div data-product-base className="size-full">
              <ProductPlaceholder
                kind={product.kind}
                name={product.name}
                light={product.light}
              />
            </div>
          </div>
          <div
            aria-hidden="true"
            data-product-detail
            className={`pointer-events-none absolute inset-0 [clip-path:inset(0_100%_0_0)] ${product.surface}`}
          >
            <div data-product-zoom className="absolute inset-[8%] scale-[1.15]">
              <ProductPlaceholder
                kind={product.kind}
                name={product.name}
                light={product.light}
                detail
              />
            </div>
            <span className="absolute left-4 top-4 h-5 w-5 border-l border-t border-ink/30" />
            <span className="absolute bottom-14 right-4 h-5 w-5 border-b border-r border-ink/30" />
          </div>
          <div className="pointer-events-none absolute inset-x-3 bottom-3 flex items-center justify-between gap-2 md:inset-x-4 md:bottom-4">
            <span className="text-[0.65rem] text-ink/60">Imagem em breve</span>
            <span
              data-product-action
              className="inline-flex min-h-9 items-center gap-2 rounded-full border border-ink/10 bg-bone/90 px-3 text-[0.65rem] text-ink"
            >
              <span className="group-open/view:hidden">Ver detalhe</span>
              <span className="hidden group-open/view:inline">Ver peça</span>
              <BrandIcon
                name="zoom-in"
                className="size-4 group-open/view:hidden"
              />
              <BrandIcon
                name="zoom-out"
                className="hidden size-4 group-open/view:block"
              />
            </span>
          </div>
        </summary>
        <p className="sr-only">
          Detalhe ampliado da ilustração provisória de{" "}
          {product.name.toLowerCase()}. Ative novamente para voltar à peça
          inteira.
        </p>
      </details>
      <figcaption className="flex items-baseline justify-between gap-3 pt-3 text-sm md:pt-4">
        <span className="relative pb-1">
          {product.name}
          <span
            data-product-underline
            aria-hidden="true"
            className="absolute inset-x-0 bottom-0 h-px origin-left scale-x-0 bg-bone"
          />
        </span>
        <span className="text-[0.65rem] text-muted">
          Prévia · {product.code}
        </span>
      </figcaption>
    </figure>
  );
}
