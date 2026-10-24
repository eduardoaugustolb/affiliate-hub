import { Navbar } from "@/components/navigation/navbar";
import { BrandIcon } from "@/components/ui/brand-icon";
import { GlitchText } from "@/components/ui/glitch-text";
import { CatalogAnchor } from "./catalog-anchor";
import { HeroIntro } from "./hero-intro";
import { HeroReveal } from "./hero-reveal";
import { HeroTitle } from "./hero-title";
import { type CatalogProps, ProductCatalog } from "./product-catalog";
export function Hero({ catalog }: { catalog: CatalogProps }) {
  return (
    <HeroIntro
      productCodes={catalog.result.items.map((product) => product.code)}
    >
      <Navbar />
      <main id="conteudo">
        <section
          id="inicio"
          aria-labelledby="hero-title"
          className="relative isolate min-h-[calc(100svh-90px)] px-[clamp(1.25rem,3.2vw,4rem)] pt-[var(--hero-title-gap)]"
        >
          <HeroTitle />

          <CatalogAnchor
            tabIndex={-1}
            className="relative z-20 pb-10 pt-2 md:pb-16 md:pt-0"
          >
            <ProductCatalog {...catalog} />
          </CatalogAnchor>
        </section>
        <HeroReveal
          as="section"
          order={6}
          id="como-encontrar"
          tabIndex={-1}
          aria-labelledby="finding-title"
          className="mx-[clamp(1.25rem,3.2vw,4rem)] flex flex-col justify-between gap-5 border-t border-line py-8 md:flex-row md:items-center md:py-12"
        >
          <h2 id="finding-title" className="text-xl tracking-tight">
            Viu uma peça no feed?
          </h2>
          <p className="max-w-100 text-sm leading-6 text-muted">
            Use o código do produto ou do outfit para encontrar as peças que
            você viu no feed.
          </p>
        </HeroReveal>
      </main>
      <HeroReveal
        as="footer"
        order={7}
        className="flex justify-between gap-6 border-t border-line px-[clamp(1.25rem,3.2vw,4rem)] py-6 text-[0.7rem] text-muted md:text-xs"
      >
        <a href="#inicio" aria-label="Voltar ao início">
          <GlitchText text="BLACK HEM" />{" "}
          <BrandIcon name="arrow-up" className="inline size-4" />
        </a>
        <span>Catálogo de roupas & acessórios</span>
      </HeroReveal>
    </HeroIntro>
  );
}
