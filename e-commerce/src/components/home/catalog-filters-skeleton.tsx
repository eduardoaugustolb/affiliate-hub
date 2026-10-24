import { Skeleton } from "@/components/ui/skeleton";
export function CatalogFiltersSkeleton() {
  return (
    <div className="space-y-5" aria-busy="true">
      <output className="sr-only">Carregando filtros…</output>
      <div className="grid items-start gap-x-7 gap-y-5">
        {["code"].map((key) => (
          <div key={key}>
            <Skeleton className="h-3 w-28" />
            <Skeleton className="mt-2 h-12 w-full" />
          </div>
        ))}
      </div>
      <div className="border-b border-line">
        <div className="flex min-h-12 items-center justify-between py-3">
          <Skeleton className="h-4 w-24" />
          <Skeleton className="size-5" />
        </div>
      </div>
      <div className="flex min-h-12 items-center gap-5">
        <Skeleton className="h-12 w-36" />
        <Skeleton className="h-12 w-16" />
      </div>
    </div>
  );
}
