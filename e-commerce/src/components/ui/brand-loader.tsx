export function BrandLoader({ overlay = false }: { overlay?: boolean }) {
  return (
    <div
      data-brand-loader
      className={`${overlay ? "fixed inset-0 z-[100]" : "min-h-dvh"} flex items-start justify-center overflow-hidden bg-ink px-[clamp(1.25rem,3.2vw,4rem)] pt-[calc(var(--site-header-height)+var(--hero-title-gap))]`}
    >
      <output className="sr-only">Carregando…</output>
      <p
        aria-hidden="true"
        className="m-0 w-full whitespace-nowrap text-center font-display text-[18.5vw] font-normal leading-[1.2] [font-kerning:none] [font-synthesis:none] [font-variant-ligatures:none] min-[900px]:text-[clamp(3.5rem,19vw,22rem)]"
      >
        BH
      </p>
    </div>
  );
}
