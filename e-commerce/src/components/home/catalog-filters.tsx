"use client";

import { type FormEvent, useId, useState } from "react";
import { AnimatedPanel } from "@/components/ui/animated-panel";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Select } from "@/components/ui/select";
import { TextField } from "@/components/ui/text-field";
import type { CatalogFilter, CatalogFilterValues } from "@/lib/catalog";

export function CatalogFilters({
  fields,
  onApply,
  initialValues = {},
}: {
  fields: CatalogFilter[];
  initialValues?: CatalogFilterValues;
  onApply: (filters: CatalogFilterValues) => void;
}) {
  const [expanded, setExpanded] = useState(false);
  const panelId = useId();
  const [values, setValues] = useState<CatalogFilterValues>(initialValues);
  const submit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    onApply(values);
  };
  const primaryFields = fields.filter((field) => field.key === "productCode");
  const extraFields = fields.filter(
    (field) => !["name", "productCode"].includes(field.key),
  );
  const extraCount = extraFields.filter((field) => {
    const value = values[field.key];
    return Array.isArray(value) ? value.length > 0 : Boolean(value?.trim());
  }).length;
  const renderField = (field: CatalogFilter) => {
    const value = values[field.key];
    if (field.type === "text")
      return (
        <TextField
          key={field.key}
          name={field.key}
          label={field.label}
          value={typeof value === "string" ? value : ""}
          onChange={(event) =>
            setValues({ ...values, [field.key]: event.target.value })
          }
          maxLength={field.maxLength}
          autoComplete="off"
          spellCheck={false}
          placeholder="Código completo"
        />
      );
    if (!field.multiple)
      return (
        <Select
          key={field.key}
          name={field.key}
          label={field.label}
          value={typeof value === "string" ? value : ""}
          onChange={(next) => setValues({ ...values, [field.key]: next })}
          options={[{ value: "", label: "Todos" }, ...field.choices]}
        />
      );
    const selected = Array.isArray(value) ? value : [];
    return (
      <fieldset key={field.key} className="min-w-0">
        <legend className="text-[0.65rem] uppercase tracking-[0.14em] text-muted">
          {field.label}
        </legend>
        <div className="mt-2 flex min-h-12 flex-wrap items-center gap-4 border-b border-line py-2">
          {field.choices.length === 0 ? (
            <span className="text-sm text-muted">Nenhuma opção disponível</span>
          ) : (
            field.choices.map((choice) => (
              <Checkbox
                key={choice.value}
                name={field.key}
                value={choice.value}
                label={choice.label}
                checked={selected.includes(choice.value)}
                onCheckedChange={(checked) =>
                  setValues({
                    ...values,
                    [field.key]: checked
                      ? [...selected, choice.value]
                      : selected.filter((item) => item !== choice.value),
                  })
                }
              />
            ))
          )}
        </div>
      </fieldset>
    );
  };
  return (
    <form
      id="filtros"
      tabIndex={-1}
      aria-label="Filtrar peças"
      onSubmit={submit}
      onReset={() => {
        setValues({});
        onApply({});
      }}
      className="space-y-5"
    >
      <div className="grid items-start gap-x-7 gap-y-5">
        {primaryFields.map((field) => (
          <div key={field.key} data-hero-item>
            {renderField(field)}
          </div>
        ))}
      </div>
      {extraFields.length > 0 && (
        <div className="border-b border-line">
          <Button
            data-hero-item
            variant="text"
            type="button"
            aria-expanded={expanded}
            aria-controls={panelId}
            onClick={() => setExpanded((previous) => !previous)}
            className="!justify-between !px-0 flex min-h-12 w-full cursor-pointer items-center justify-between gap-4 py-3 text-left text-xs text-muted transition-colors hover:text-bone"
          >
            <span>Mais filtros{extraCount > 0 ? ` (${extraCount})` : ""}</span>
            <span
              aria-hidden="true"
              className={`text-lg transition-transform duration-300 motion-reduce:transition-none ${expanded ? "rotate-45" : "rotate-0"}`}
            >
              +
            </span>
          </Button>
          <AnimatedPanel
            id={panelId}
            open={expanded}
            expandedOverflow="visible"
          >
            <div className="grid items-start gap-x-7 gap-y-6 pb-6 pt-3 sm:grid-cols-2 lg:grid-cols-4">
              {extraFields.map(renderField)}
            </div>
          </AnimatedPanel>
        </div>
      )}
      <div className="flex min-h-12 items-center gap-5">
        <Button data-hero-item type="submit">
          Buscar peças
        </Button>
        <Button data-hero-item type="reset" variant="text">
          Limpar
        </Button>
      </div>
    </form>
  );
}
