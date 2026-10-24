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
    <div data-lenis-prevent className="admin-table" aria-busy={loading}>
      {loading && <output className="sr-only">Carregando produtos…</output>}
      <table className="admin-product-table">
        <colgroup>
          <col style={{ width: "28%" }} />
          <col style={{ width: "12%" }} />
          <col style={{ width: "14%" }} />
          <col style={{ width: "12%" }} />
          <col style={{ width: "34%" }} />
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
                  <div className="admin-row">
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
                <td className="admin-product-name" data-label="Produto">
                  <strong>{product.name}</strong>
                </td>
                <td className="admin-product-code" data-label="Código">
                  <code>{product.code}</code>
                </td>
                <td
                  className="admin-product-marketplace"
                  data-label="Marketplace"
                >
                  {product.marketplace === "shopee"
                    ? "Shopee"
                    : product.marketplace === "shein"
                      ? "Shein"
                      : product.marketplace}
                </td>
                <td className="admin-product-status" data-label="Status">
                  <span className="admin-badge">
                    {product.status === "active" ? "Ativo" : "Inativo"}
                  </span>
                </td>
                <td className="admin-product-actions" data-label="Ações">
                  <div className="admin-row">
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
