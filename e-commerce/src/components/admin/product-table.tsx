"use client";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import type { Product } from "@/lib/admin";

const skeletonRows = Array.from(
  { length: 25 },
  (_, index) => `loading-${index}`,
);
const headings = ["Produto", "Código", "Marketplace", "Status", "Ações"];
export function ProductTable({
  products = [],
  loading = false,
  onEdit,
  onDelete,
}: {
  products?: Product[];
  loading?: boolean;
  onEdit?: (product: Product) => void;
  onDelete?: (product: Product) => void;
}) {
  return (
    <div
      data-lenis-prevent
      className="overflow-x-auto max-[1099px]:overflow-visible"
      aria-busy={loading}
    >
      {loading && <output className="sr-only">Carregando produtos…</output>}
      <table className="w-full min-w-[850px] table-fixed border-collapse text-left text-sm [&_th]:text-[0.7rem] [&_th]:font-normal [&_th]:text-[#a5a8a0] [&_th]:px-3 [&_th]:py-[1.1rem] [&_th]:border-b [&_th]:border-[#ffffff12] [&_td]:px-3 [&_td]:py-[1.1rem] [&_td]:border-b [&_td]:border-[#ffffff12] [&_tbody_tr]:h-22 [&_tbody_tr:last-child_td]:border-b-0 [&_strong]:block [&_strong]:truncate [&_strong]:font-medium [&_.app-button]:px-3! max-[1099px]:block max-[1099px]:min-w-0 max-[1099px]:[&_colgroup]:hidden max-[1099px]:[&_thead]:sr-only max-[1099px]:[&_tbody]:grid max-[1099px]:[&_tbody]:w-full max-[1099px]:[&_tbody]:gap-4 min-[700px]:max-[1099px]:[&_tbody]:grid-cols-2 max-[1099px]:[&_tbody_tr]:grid max-[1099px]:[&_tbody_tr]:h-auto max-[1099px]:[&_tbody_tr]:grid-cols-[minmax(0,1fr)_auto] max-[1099px]:[&_tbody_tr]:[grid-template-areas:'name_status'_'code_marketplace'_'actions_actions'] max-[1099px]:[&_tbody_tr]:content-start max-[1099px]:[&_tbody_tr]:gap-x-4 max-[1099px]:[&_tbody_tr]:gap-y-5 max-[1099px]:[&_tbody_tr]:rounded-[1.25rem] max-[1099px]:[&_tbody_tr]:border max-[1099px]:[&_tbody_tr]:border-[#ffffff12] max-[1099px]:[&_tbody_tr]:bg-[#20211f] max-[1099px]:[&_tbody_tr]:p-4 max-[1099px]:[&_td]:min-w-0 max-[1099px]:[&_td]:border-0 max-[1099px]:[&_td]:p-0 max-[1099px]:[&_td]:[overflow-wrap:anywhere] max-[1099px]:[&_td]:before:mb-[0.4rem] max-[1099px]:[&_td]:before:block max-[1099px]:[&_td]:before:text-[0.65rem] max-[1099px]:[&_td]:before:text-[#a5a8a0] max-[1099px]:[&_td]:before:content-[attr(data-label)] max-[1099px]:[&_td[colspan]]:col-span-full max-[1099px]:[&_strong]:whitespace-normal max-[1099px]:[&_strong]:text-lg max-[1099px]:[&_strong]:leading-[1.4] max-[1099px]:[&_strong]:[overflow-wrap:anywhere]">
        <colgroup>
          <col className="w-[28%]" />
          <col className="w-[12%]" />
          <col className="w-[14%]" />
          <col className="w-[12%]" />
          <col className="w-[34%]" />
        </colgroup>
        <thead>
          <tr>
            {headings.map((label) => (
              <th key={label} scope="col">
                {label}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {loading ? (
            skeletonRows.slice(0, products.length || 5).map((key) => (
              <tr key={key}>
                <td>
                  <Skeleton className="h-5 w-4/5" />
                </td>
                <td>
                  <Skeleton className="h-4 w-16" />
                </td>
                <td>
                  <Skeleton className="h-4 w-16" />
                </td>
                <td>
                  <Skeleton className="h-7 w-16 rounded-full" />
                </td>
                <td>
                  <div className="flex flex-nowrap items-center gap-3 max-[1099px]:flex-wrap max-[1099px]:gap-2">
                    <Skeleton className="h-12 w-20" />
                    <Skeleton className="h-5 w-20" />
                    <Skeleton className="h-12 w-20" />
                  </div>
                </td>
              </tr>
            ))
          ) : products.length ? (
            products.map((product) => (
              <tr key={product.code}>
                <td
                  className="max-[1099px]:[grid-area:name]"
                  data-label="Produto"
                >
                  <strong>{product.name}</strong>
                </td>
                <td
                  className="[&_code]:font-mono [&_code]:text-[0.7rem] [&_code]:text-[#a5a8a0] max-[1099px]:[grid-area:code]"
                  data-label="Código"
                >
                  <code>{product.code}</code>
                </td>
                <td
                  className="max-[1099px]:[grid-area:marketplace]"
                  data-label="Marketplace"
                >
                  {product.marketplace === "shopee"
                    ? "Shopee"
                    : product.marketplace === "shein"
                      ? "Shein"
                      : product.marketplace}
                </td>
                <td
                  className="max-[1099px]:self-start max-[1099px]:[grid-area:status]"
                  data-label="Status"
                >
                  <span
                    className="inline-block whitespace-nowrap rounded-[20px] bg-[#ffffff0a] px-[0.65rem] py-[0.4rem] text-[0.7rem] data-[status=active]:bg-[#b9f87915] data-[status=active]:text-[#b9f879] data-[status=inactive]:bg-[#ffa63115] data-[status=inactive]:text-[#ffa631]"
                    data-status={product.status}
                  >
                    {product.status === "active" ? "Ativo" : "Inativo"}
                  </span>
                </td>
                <td
                  className="[&_a]:whitespace-nowrap [&_a]:text-xs max-[1099px]:border-t! max-[1099px]:border-[#ece9e225]! max-[1099px]:pt-3! max-[1099px]:[grid-area:actions] max-[1099px]:[&>div]:grid max-[1099px]:[&>div]:grid-cols-3 max-[1099px]:[&>div]:gap-2 max-[1099px]:[&_:is(.app-button,a)]:inline-flex! max-[1099px]:[&_:is(.app-button,a)]:min-h-11! max-[1099px]:[&_:is(.app-button,a)]:min-w-0! max-[1099px]:[&_:is(.app-button,a)]:flex-[1_1_auto] max-[1099px]:[&_:is(.app-button,a)]:items-center max-[1099px]:[&_:is(.app-button,a)]:justify-center max-[1099px]:[&_:is(.app-button,a)]:rounded-full! max-[1099px]:[&_:is(.app-button,a)]:border! max-[1099px]:[&_:is(.app-button,a)]:border-[#ece9e238]! max-[1099px]:[&_:is(.app-button,a)]:px-1! max-[1099px]:[&_:is(.app-button,a)]:py-2! max-[1099px]:[&_:is(.app-button,a)]:text-xs! max-[1099px]:[&_.app-button:first-child]:border-[#b9f879]! max-[1099px]:[&_.app-button:first-child]:bg-[#b9f879]! max-[1099px]:[&_.app-button:first-child]:text-[#10160a]!"
                  data-label="Ações"
                >
                  <div className="flex flex-nowrap items-center gap-3 max-[1099px]:flex-wrap max-[1099px]:gap-2">
                    <Button
                      variant="outline"
                      aria-label={`Editar ${product.name}`}
                      onClick={() => onEdit?.(product)}
                    >
                      Editar
                    </Button>
                    <a
                      href={product.destinationUrl}
                      target="_blank"
                      rel="noreferrer"
                    >
                      Destino ↗
                    </a>
                    <Button
                      variant="outline"
                      aria-label={`Excluir ${product.name}`}
                      onClick={() => onDelete?.(product)}
                    >
                      Excluir
                    </Button>
                  </div>
                </td>
              </tr>
            ))
          ) : (
            <tr>
              <td colSpan={5}>Nenhum produto nesta página.</td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  );
}
