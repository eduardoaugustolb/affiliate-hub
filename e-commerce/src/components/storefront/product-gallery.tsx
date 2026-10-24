"use client";
import { useState } from "react";
import { BrandIcon } from "@/components/ui/brand-icon";

export function ProductGallery({
  images,
  name,
}: {
  images: string[];
  name: string;
}) {
  const [active, setActive] = useState(0);
  const count = images.length;
  const move = (step: number) =>
    setActive((index) => (index + step + count) % count);
  return (
    <section
      aria-label={`Fotos de ${name}`}
      className="product-gallery min-w-0"
    >
      <div className="product-gallery-frame relative overflow-hidden bg-surface">
        {images.map((src, index) => (
          <div key={src} hidden={index !== active} data-gallery-slide>
            {/* biome-ignore lint/performance/noImgElement: Marketplace image origins are arbitrary. */}
            <img
              src={src}
              alt={count > 1 ? `${name} — foto ${index + 1} de ${count}` : name}
              fetchPriority={index === 0 ? "high" : "auto"}
              loading={index === 0 ? "eager" : "lazy"}
              className="size-full object-cover"
            />
          </div>
        ))}
      </div>
      {count > 1 && (
        <>
          <div className="product-gallery-controls flex shrink-0 items-center justify-between border-b border-line py-1">
            <output className="text-xs text-muted">
              Foto {active + 1} de {count}
            </output>
            <div className="flex gap-1">
              <button
                type="button"
                aria-label="Foto anterior"
                onClick={() => move(-1)}
                className="flex size-11 cursor-pointer items-center justify-center hover:bg-bone hover:text-ink"
              >
                <BrandIcon name="arrow-left" className="size-4" />
              </button>
              <button
                type="button"
                aria-label="Próxima foto"
                onClick={() => move(1)}
                className="flex size-11 cursor-pointer items-center justify-center hover:bg-bone hover:text-ink"
              >
                <BrandIcon name="arrow-right" className="size-4" />
              </button>
            </div>
          </div>
          <fieldset
            aria-label="Selecionar foto"
            data-lenis-prevent
            className="product-gallery-thumbnails mt-2 flex min-w-0 shrink-0 gap-2 overflow-x-auto pb-1"
            onKeyDown={(event) => {
              const keys = ["ArrowLeft", "ArrowRight", "Home", "End"];
              if (!keys.includes(event.key)) return;
              event.preventDefault();
              const next =
                event.key === "Home"
                  ? 0
                  : event.key === "End"
                    ? count - 1
                    : (active + (event.key === "ArrowRight" ? 1 : -1) + count) %
                      count;
              setActive(next);
              event.currentTarget
                .querySelectorAll<HTMLButtonElement>("[data-gallery-thumb]")
                [next]?.focus();
            }}
          >
            <legend className="sr-only">Selecionar foto</legend>
            {images.map((src, index) => (
              <button
                key={src}
                data-gallery-thumb
                type="button"
                onClick={() => setActive(index)}
                aria-label={`Ver foto ${index + 1}`}
                aria-pressed={active === index}
                className={`w-16 shrink-0 cursor-pointer overflow-hidden border bg-surface sm:w-20 ${active === index ? "border-bone" : "border-line opacity-60 hover:opacity-100"}`}
              >
                {/* biome-ignore lint/performance/noImgElement: Marketplace image origins are arbitrary. */}
                <img
                  src={src}
                  alt=""
                  loading="lazy"
                  className="aspect-[4/5] w-full object-cover"
                />
              </button>
            ))}
          </fieldset>
        </>
      )}
    </section>
  );
}
