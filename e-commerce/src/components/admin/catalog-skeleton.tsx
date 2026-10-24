import { Skeleton } from "@/components/ui/skeleton";
import { ProductOptions } from "./product-options";
export function CatalogSkeleton() {
  return (
    <div className="admin-stack" aria-busy="true">
      <output className="sr-only">Carregando filtros…</output>
      <div className="admin-grid">
        {["size", "color"].map((key) => (
          <section key={key} className="admin-panel admin-stack">
            <Skeleton className="h-7 w-28" />
            <div className="admin-row">
              <Skeleton className="h-12 w-16" />
              <Skeleton className="h-12 w-20" />
            </div>
            <div className="admin-stack">
              <div>
                <Skeleton className="h-4 w-36" />
                <Skeleton className="mt-2 h-12 w-full" />
              </div>
              <Skeleton className="h-12 w-full" />
            </div>
          </section>
        ))}
      </div>
      <section className="admin-panel admin-stack">
        <Skeleton className="h-7 w-64" />
        <div>
          <Skeleton className="h-5 w-full" />
          <Skeleton className="mt-1 h-5 w-3/4" />
        </div>
        <div className="admin-stack">
          <div>
            <Skeleton className="h-4 w-32" />
            <Skeleton className="mt-2 h-12 w-full" />
          </div>
          <ProductOptions
            filters={[]}
            selected={[]}
            onChange={() => {}}
            loading
          />
          <Skeleton className="h-12 w-full" />
        </div>
      </section>
    </div>
  );
}
