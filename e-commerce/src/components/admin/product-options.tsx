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
    <div
      className="grid grid-cols-[repeat(auto-fit,minmax(min(100%,280px),1fr))] gap-5 [&>*]:min-w-0"
      aria-busy={loading}
    >
      {(["size", "color"] as const).map((key) => {
        const field = filters.find((f) => f.key === key);
        return (
          <fieldset
            key={key}
            className="min-w-0 rounded-2xl border border-[#ffffff20] p-4 max-[639px]:p-3"
            disabled={disabled || loading}
          >
            <legend className="px-[0.35rem] text-[0.8rem] text-[#a5a8a0]">
              {key === "size" ? "Tamanhos" : "Cores"}
            </legend>
            <div className="flex flex-wrap items-center gap-3 min-h-12">
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
                <p className="text-[#a5a8a0]">
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
