import { Skeleton } from "@/components/ui/skeleton";
import { ProductOptions } from "./product-options";
export function CatalogSkeleton() {
  return (
    <div className="grid gap-5 [&>*]:min-w-0" aria-busy="true">
      <output className="sr-only">Carregando filtros…</output>
      <div className="grid grid-cols-[repeat(auto-fit,minmax(min(100%,280px),1fr))] gap-5 [&>*]:min-w-0">
        {["size", "color"].map((key) => (
          <section
            key={key}
            className="min-w-0 rounded-3xl border border-[#ffffff12] bg-[#20211f] p-6 max-[639px]:p-[1.15rem] grid gap-5 [&>*]:min-w-0"
          >
            <Skeleton className="h-7 w-28" />
            <div className="flex flex-wrap items-center gap-3">
              <Skeleton className="h-12 w-16" />
              <Skeleton className="h-12 w-20" />
            </div>
            <div className="grid gap-5 [&>*]:min-w-0">
              <div>
                <Skeleton className="h-4 w-36" />
                <Skeleton className="mt-2 h-12 w-full" />
              </div>
              <Skeleton className="h-12 w-full" />
            </div>
          </section>
        ))}
      </div>
      <section className="min-w-0 rounded-3xl border border-[#ffffff12] bg-[#20211f] p-6 max-[639px]:p-[1.15rem] grid gap-5 [&>*]:min-w-0">
        <Skeleton className="h-7 w-64" />
        <div>
          <Skeleton className="h-5 w-full" />
          <Skeleton className="mt-1 h-5 w-3/4" />
        </div>
        <div className="grid gap-5 [&>*]:min-w-0">
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
