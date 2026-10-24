"use client";
import { Checkbox } from "@/components/ui/checkbox";
import { Skeleton } from "@/components/ui/skeleton";
import type { CatalogFilter } from "@/lib/catalog";
export function ProductOptions({
  filters,
  selected,
  onChange,
  loading = false,
  disabled = false,
}: {
  filters: CatalogFilter[];
  selected: string[];
  onChange: (ids: string[]) => void;
  loading?: boolean;
  disabled?: boolean;
}) {
  return (
    <div className="admin-grid" aria-busy={loading}>
      {(["size", "color"] as const).map((key) => {
        const field = filters.find((f) => f.key === key);
        return (
          <fieldset
            key={key}
            className="admin-option-group"
            disabled={disabled || loading}
          >
            <legend>{key === "size" ? "Tamanhos" : "Cores"}</legend>
            <div className="admin-row admin-option-choices">
              {loading ? (
                <>
                  <Skeleton className="h-10 w-20" />
                  <Skeleton className="h-10 w-24" />
                  <Skeleton className="h-10 w-16" />
                </>
              ) : field?.type === "choices" && field.choices.length ? (
                field.choices.map((choice) => (
                  <Checkbox
                    key={choice.value}
                    label={choice.label}
                    name="optionIds"
                    value={choice.value}
                    checked={selected.includes(choice.value)}
                    disabled={disabled}
                    onCheckedChange={(checked) =>
                      onChange(
                        checked
                          ? [...selected, choice.value]
                          : selected.filter((id) => id !== choice.value),
                      )
                    }
                  />
                ))
              ) : (
                <p className="admin-muted">
                  Nenhuma opção cadastrada. Adicione na seção Filtros.
                </p>
              )}
            </div>
          </fieldset>
        );
      })}
    </div>
  );
}
