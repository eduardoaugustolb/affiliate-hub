"use client";
import { type FormEvent, useState } from "react";
import { Button } from "@/components/ui/button";
import { Reveal } from "@/components/ui/reveal";
import { Select } from "@/components/ui/select";
import { TextField } from "@/components/ui/text-field";
import type { Product } from "@/lib/admin";
import type { CatalogFilter } from "@/lib/catalog";
import { ProductOptions } from "./product-options";
export function ProductEditor({
  product,
  busy,
  onSave,
  onCancel,
  filters,
  optionIds,
}: {
  product: Product | "new";
  busy: boolean;
  onSave: (event: FormEvent<HTMLFormElement>) => void;
  onCancel: () => void;
  filters: CatalogFilter[];
  optionIds: string[];
}) {
  const [marketplace, setMarketplace] = useState(
      product === "new" ? "shopee" : product.marketplace,
    ),
    [status, setStatus] = useState(
      product === "new" ? "active" : product.status,
    );
  const [selected, setSelected] = useState<string[]>(optionIds);
  return (
    <Reveal
      as="section"
      className="admin-panel admin-stack"
      aria-label="Editor de produto"
    >
      <div data-enter>
        <p className="admin-eyebrow">Catálogo / Produto</p>
        <h2 className="text-xl">
          {product === "new" ? "Novo produto" : `Editar ${product.code}`}
        </h2>
      </div>
      <form onSubmit={onSave} className="admin-stack" data-enter>
        <fieldset disabled={busy} className="admin-form-fields admin-stack">
          <div className="admin-grid">
            <TextField
              label="Nome"
              required
              maxLength={160}
              name="name"
              defaultValue={product === "new" ? "" : product.name}
            />
            <Select
              label="Marketplace"
              name="marketplace"
              value={marketplace}
              onChange={setMarketplace}
              disabled={busy}
              options={[
                { value: "shopee", label: "Shopee" },
                { value: "shein", label: "Shein" },
              ]}
            />
            <TextField
              label="Link de destino (HTTPS)"
              required
              type="url"
              pattern="https://.*"
              name="destinationUrl"
              defaultValue={product === "new" ? "" : product.destinationUrl}
            />
            <TextField
              label="URL da imagem (HTTPS)"
              required
              type="url"
              pattern="https://.*"
              name="imageUrl"
              defaultValue={product === "new" ? "" : product.imageUrl}
            />
            <Select
              label="Status"
              name="status"
              value={status}
              onChange={setStatus}
              disabled={busy}
              options={[
                { value: "active", label: "Ativo" },
                { value: "inactive", label: "Inativo" },
              ]}
            />
          </div>
          <div>
            <label
              htmlFor="product-gallery"
              className="text-[0.65rem] uppercase tracking-[0.14em] text-muted"
            >
              Outras imagens da galeria (HTTPS)
            </label>
            <textarea
              id="product-gallery"
              name="additionalImageUrls"
              rows={5}
              defaultValue={
                product === "new" ? "" : product.imageUrls.slice(1).join("\n")
              }
              aria-describedby="product-gallery-hint"
              className="mt-2 w-full resize-y border border-line bg-ink p-3 text-sm text-bone"
            />
            <p
              id="product-gallery-hint"
              className="mt-2 text-xs leading-5 text-muted"
            >
              Uma URL por linha, na ordem de exibição. Até 19 imagens
              adicionais. A URL da imagem acima é a capa.
            </p>
          </div>
          <div className="admin-divider">
            <h3>Tamanho e cor</h3>
            <p className="admin-muted">
              Selecione todas as opções disponíveis para esta peça.
            </p>
          </div>
          <ProductOptions
            filters={filters}
            selected={selected}
            onChange={setSelected}
            disabled={busy}
          />
        </fieldset>
        <div className="admin-row admin-form-actions">
          <Button type="submit" disabled={busy}>
            {busy ? "Salvando…" : "Salvar produto"}
          </Button>
          <Button variant="outline" disabled={busy} onClick={onCancel}>
            Cancelar
          </Button>
        </div>
      </form>
    </Reveal>
  );
}
