import Link from "next/link";
import type { ReactNode } from "react";
import { BrandIcon } from "@/components/ui/brand-icon";
export function StoreShell({ children }: { children: ReactNode }) {
  return (
    <>
      <header className="store-header sticky top-0 z-40 flex min-h-[var(--site-header-height)] items-center justify-between gap-6 border-b border-line bg-ink/95 px-[clamp(1.25rem,3.2vw,4rem)] backdrop-blur-md">
        <Link
          href="/"
          aria-label="BLACK HEM — início"
          className="font-display text-[clamp(1.4rem,2.2vw,1.9rem)]"
        >
          BLACK HEM
        </Link>
        <Link
          href="/#pecas"
          scroll={false}
          className="flex min-h-11 items-center gap-3 text-xs text-muted hover:text-bone"
        >
          <BrandIcon name="grid" className="size-4" />
          Explorar peças
        </Link>
      </header>
      <main
        id="conteudo"
        className="store-main px-[clamp(1.25rem,3.2vw,4rem)] pb-16 pt-7 md:pt-10"
      >
        {children}
      </main>
      <footer className="flex flex-wrap justify-between gap-5 border-t border-line px-[clamp(1.25rem,3.2vw,4rem)] py-7 text-xs text-muted">
        <Link href="/" className="font-display text-xl text-bone">
          BLACK HEM
        </Link>
        <span>Peças do feed. Escolhas suas.</span>
      </footer>
    </>
  );
}
export function BackToCatalog() {
  return (
    <Link
      href="/#pecas"
      scroll={false}
      className="mb-7 inline-flex min-h-11 items-center gap-3 text-xs text-muted hover:text-bone"
    >
      <BrandIcon name="arrow-left" className="size-4" />
      Voltar ao catálogo
    </Link>
  );
}
