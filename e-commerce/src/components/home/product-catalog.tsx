"use client";
import { useRouter } from "next/navigation";
import { useTransition } from "react";
import { useScrollLock } from "@/components/providers/smooth-scroll";
import { BrandLoader } from "@/components/ui/brand-loader";
import { Button } from "@/components/ui/button";
import {
  type CatalogFilter,
  type CatalogFilterValues,
  type SearchResult,
  searchQuery,
} from "@/lib/catalog";
import { CatalogCard } from "./catalog-card";
import { CatalogFilters } from "./catalog-filters";
import { HeroReveal } from "./hero-reveal";

export type CatalogProps = {
  fields: CatalogFilter[];
  filters: CatalogFilterValues;
  result: SearchResult;
  error: string;
  filtersError: string;
};
export function ProductCatalog({
  fields,
  filters,
  result,
  error,
  filtersError,
}: CatalogProps) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  useScrollLock(pending);
  function navigate(values: CatalogFilterValues, offset = 0) {
    const query = new URLSearchParams(searchQuery(values, offset));
    query.delete("limit");
    startTransition(() => router.push(`/?${query}#pecas`, { scroll: false }));
  }
  const retry = () => startTransition(() => router.refresh());
  return (
    <>
      {pending && <BrandLoader overlay />}
      <HeroReveal
        staggerItems
        data-catalog-controls
        order={1}
        className="relative z-30 mb-7 border-b border-line pb-6 md:mb-9"
      >
        <h2 data-hero-item className="mb-7 text-lg tracking-tight md:text-xl">
          Explore as peças
        </h2>
        {filtersError ? (
          <div data-hero-item role="alert">
            <p>{filtersError}</p>
            <Button variant="text" onClick={retry}>
              Tentar novamente
            </Button>
          </div>
        ) : (
          <CatalogFilters
            fields={fields}
            initialValues={filters}
            onApply={navigate}
          />
        )}
        <output data-hero-item className="mt-5 block text-xs text-muted">
          {error
            ? "Busca não concluída"
            : `${result.items.length} ${result.items.length === 1 ? "peça nesta página" : "peças nesta página"}${result.hasMore ? " · há mais resultados" : ""}`}
        </output>
      </HeroReveal>
      <div className="grid grid-cols-2 gap-x-4 gap-y-7 lg:grid-cols-4 lg:gap-x-6">
        {result.items.map((product, index) => (
          <CatalogCard key={product.code} product={product} index={index} />
        ))}
      </div>
      <div className="py-8 text-center">
        {error ? (
          <div role="alert">
            <p className="mb-3 text-sm text-muted">{error}</p>
            <Button variant="text" onClick={retry}>
              Tentar novamente
            </Button>
          </div>
        ) : (
          <>
            {!result.items.length && (
              <p className="text-sm text-muted">
                Nenhuma peça encontrada. Tente outro código ou limpe os filtros.
              </p>
            )}
            <div className="flex items-center justify-center gap-5">
              {result.offset > 0 && (
                <Button
                  variant="text"
                  disabled={pending}
                  onClick={() =>
                    navigate(filters, Math.max(0, result.offset - result.limit))
                  }
                >
                  Peças anteriores
                </Button>
              )}
              {result.hasMore && (
                <Button
                  variant="text"
                  disabled={pending}
                  onClick={() =>
                    navigate(filters, result.offset + result.limit)
                  }
                >
                  Próximas peças
                </Button>
              )}
            </div>
          </>
        )}
      </div>
    </>
  );
}
