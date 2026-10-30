"use client";
import { type FormEvent, useState } from "react";
import {
  createOptionAction,
  createOutfitAction,
  deleteOptionAction,
  deleteOutfitAction,
  setProductOptionsAction,
} from "@/app/admin/actions";
import { useScrollLock } from "@/components/providers/smooth-scroll";
import { BrandIcon } from "@/components/ui/brand-icon";
import { BrandLoader } from "@/components/ui/brand-loader";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Reveal } from "@/components/ui/reveal";
import { TextField } from "@/components/ui/text-field";
import { actionRequest, type Outfit } from "@/lib/admin";
import type { CatalogFilter } from "@/lib/catalog";

import { ConfirmDialog } from "./confirm-dialog";

export function CatalogAdmin({
  section,
  onError,
  filters,
  outfit,
  onRefresh,
  onNavigate,
}: {
  section: string;
  onError: (error: unknown) => void;
  filters: CatalogFilter[];
  outfit: Outfit | null;
  onRefresh: () => void;
  onNavigate: (code?: string) => void;
}) {
  const [busy, setBusy] = useState(false);
  useScrollLock(busy);
  const [notice, setNotice] = useState("");
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [optionDelete, setOptionDelete] = useState<{
    value: string;
    label: string;
  } | null>(null);
  async function execute(action: () => Promise<void>) {
    setBusy(true);
    setNotice("");
    try {
      await action();
    } catch (error) {
      onError(error);
    } finally {
      setBusy(false);
    }
  }
  function createOption(event: FormEvent<HTMLFormElement>, key: string) {
    event.preventDefault();
    const form = event.currentTarget;
    const name = String(new FormData(form).get("name")).trim();
    void execute(async () => {
      await actionRequest(createOptionAction(key, name));
      form.reset();
      onRefresh();
      setNotice("Opção criada.");
    });
  }
  function setOptions(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const data = new FormData(event.currentTarget);
    void execute(async () => {
      await actionRequest(
        setProductOptionsAction(data.get("code"), data.getAll("optionIds")),
      );
      setNotice("Opções do produto substituídas.");
    });
  }
  function createOutfit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const data = new FormData(event.currentTarget);
    void execute(async () => {
      const created = await actionRequest(
        createOutfitAction({
          name: String(data.get("name")).trim(),
          productCodes: String(data.get("codes"))
            .split(/[\s,]+/)
            .filter(Boolean)
            .map((code) => code.toUpperCase()),
        }),
      );
      onNavigate(created.code);
      setConfirmDelete(false);
      setNotice("Outfit criado. Guarde o código abaixo para consultar depois.");
    });
  }
  function findOutfit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const code = String(new FormData(event.currentTarget).get("code"))
      .trim()
      .toUpperCase();
    setConfirmDelete(false);
    onNavigate(code);
  }
  return (
    <Reveal
      className="grid gap-5 [&>*]:min-w-0"
      transitionKey={`${section}-${outfit?.code ?? ""}`}
    >
      {busy && <BrandLoader overlay />}
      <div data-enter>
        <h2 className="text-2xl">
          {section === "filters" ? "Filtros do catálogo" : "Outfits"}
        </h2>
        <p className="text-[#a5a8a0]">
          {section === "filters"
            ? "Organize as opções de tamanho e cor disponíveis na loja."
            : "Reúna produtos em uma seleção e consulte pelo código."}
        </p>
      </div>
      {notice && (
        <output className="rounded-2xl border border-[#b9f87945] bg-[#b9f87908] p-4 [overflow-wrap:anywhere]">
          {notice}
        </output>
      )}
      {section === "filters" ? (
        <>
          <div className="grid grid-cols-[repeat(auto-fit,minmax(min(100%,280px),1fr))] gap-5 [&>*]:min-w-0">
            {filters
              .filter(
                (filter) => filter.key === "size" || filter.key === "color",
              )
              .map((filter) => (
                <section
                  key={filter.key}
                  className="min-w-0 rounded-3xl border border-[#ffffff12] bg-[#20211f] p-6 max-[639px]:p-[1.15rem] grid gap-5 [&>*]:min-w-0"
                >
                  <h3 className="text-xl">{filter.label}</h3>
                  <div className="flex flex-wrap items-center gap-3">
                    {filter.type === "choices" &&
                      filter.choices.map((choice) => (
                        <Button
                          variant="outline"
                          type="button"
                          key={choice.value}
                          disabled={busy}
                          aria-label={`Excluir opção ${choice.label}`}
                          onClick={() => setOptionDelete(choice)}
                        >
                          <span>{choice.label}</span>
                          <BrandIcon
                            name="close"
                            className="size-3.5 shrink-0"
                          />
                        </Button>
                      ))}
                    {filter.type === "choices" && !filter.choices.length && (
                      <p className="text-[#a5a8a0]">
                        Nenhuma opção cadastrada.
                      </p>
                    )}
                  </div>
                  <form
                    onSubmit={(event) => createOption(event, filter.key)}
                    className="grid gap-5 [&>*]:min-w-0"
                  >
                    <TextField
                      label={`Nova opção de ${filter.label.toLowerCase()}`}
                      required
                      maxLength={160}
                      name="name"
                    />
                    <Button variant="outline" type="submit" disabled={busy}>
                      Adicionar opção
                    </Button>
                  </form>
                </section>
              ))}
          </div>
          {optionDelete && (
            <ConfirmDialog
              title={`Excluir a opção “${optionDelete.label}”?`}
              busy={busy}
              onCancel={() => setOptionDelete(null)}
              onConfirm={() => {
                void execute(async () => {
                  await actionRequest(deleteOptionAction(optionDelete.value));
                  setOptionDelete(null);
                  onRefresh();
                  setNotice("Opção excluída.");
                });
              }}
            >
              As associações dos produtos com esta opção serão removidas.
            </ConfirmDialog>
          )}
          <section className="min-w-0 rounded-3xl border border-[#ffffff12] bg-[#20211f] p-6 max-[639px]:p-[1.15rem] grid gap-5 [&>*]:min-w-0">
            <h3 className="text-xl">Definir filtros de um produto</h3>
            <p className="text-[#a5a8a0]">
              A seleção substitui todas as opções atuais do produto. Sem opções
              marcadas, todas as associações serão removidas. Marque o conjunto
              completo desejado, ou edite o produto para ver as opções atuais.
            </p>
            <form onSubmit={setOptions} className="grid gap-5 [&>*]:min-w-0">
              <TextField
                label="Código do produto"
                required
                name="code"
                minLength={4}
                maxLength={6}
                pattern="[A-Za-z0-9]{4,6}"
              />
              <div className="grid grid-cols-[repeat(auto-fit,minmax(min(100%,280px),1fr))] gap-5 [&>*]:min-w-0">
                {filters
                  .filter((filter) => ["size", "color"].includes(filter.key))
                  .map((filter) => (
                    <fieldset
                      key={filter.key}
                      className="min-w-0 rounded-2xl border border-[#ffffff20] p-4 max-[639px]:p-3"
                    >
                      <legend>{filter.label}</legend>
                      <div className="flex flex-wrap items-center gap-3">
                        {filter.type === "choices" &&
                          filter.choices.map((choice) => (
                            <Checkbox
                              key={choice.value}
                              label={choice.label}
                              name="optionIds"
                              value={choice.value}
                              disabled={busy}
                            />
                          ))}
                      </div>
                    </fieldset>
                  ))}
              </div>
              <Button variant="outline" type="submit" disabled={busy}>
                Substituir filtros do produto
              </Button>
            </form>
          </section>
        </>
      ) : (
        <>
          <div className="grid grid-cols-[repeat(auto-fit,minmax(min(100%,280px),1fr))] gap-5 [&>*]:min-w-0">
            <section className="min-w-0 rounded-3xl border border-[#ffffff12] bg-[#20211f] p-6 max-[639px]:p-[1.15rem] grid gap-5 [&>*]:min-w-0">
              <h3 className="text-xl">Criar outfit</h3>
              <form
                onSubmit={createOutfit}
                className="grid gap-5 [&>*]:min-w-0"
              >
                <TextField label="Nome" required maxLength={160} name="name" />
                <TextField
                  label="Códigos dos produtos"
                  required
                  name="codes"
                  placeholder="Separe por vírgula ou espaço"
                />
                <Button variant="outline" type="submit" disabled={busy}>
                  Criar outfit
                </Button>
              </form>
            </section>
            <section className="min-w-0 rounded-3xl border border-[#ffffff12] bg-[#20211f] p-6 max-[639px]:p-[1.15rem] grid gap-5 [&>*]:min-w-0">
              <h3 className="text-xl">Consultar outfit</h3>
              <p className="text-[#a5a8a0]">
                Use o código recebido na criação.
              </p>
              <form onSubmit={findOutfit} className="grid gap-5 [&>*]:min-w-0">
                <TextField
                  label="Código do outfit"
                  required
                  name="code"
                  maxLength={20}
                  pattern="[A-Za-z0-9-]+"
                />
                <Button variant="outline" type="submit" disabled={busy}>
                  Consultar
                </Button>
              </form>
            </section>
          </div>
          {outfit && (
            <Reveal
              as="section"
              className="min-w-0 rounded-3xl border border-[#ffffff12] bg-[#20211f] p-6 max-[639px]:p-[1.15rem] grid gap-5 [&>*]:min-w-0"
            >
              <div className="flex flex-wrap items-center gap-3 justify-between">
                <h3 className="text-xl">{outfit.name}</h3>
                <code className="font-mono">{outfit.code}</code>
              </div>
              <p>Produtos: {outfit.productCodes.join(", ")}</p>
              {confirmDelete ? (
                <>
                  <p>
                    Excluir este outfit definitivamente? Os produtos serão
                    preservados.
                  </p>
                  <div className="flex flex-wrap items-center gap-3">
                    <Button
                      variant="outline"
                      type="button"
                      disabled={busy}
                      onClick={() =>
                        execute(async () => {
                          await actionRequest(deleteOutfitAction(outfit.code));
                          onNavigate();
                          setConfirmDelete(false);
                          setNotice("Outfit excluído.");
                        })
                      }
                    >
                      Confirmar exclusão
                    </Button>
                    <Button
                      variant="outline"
                      type="button"
                      disabled={busy}
                      onClick={() => setConfirmDelete(false)}
                    >
                      Cancelar
                    </Button>
                  </div>
                </>
              ) : (
                <Button
                  variant="outline"
                  type="button"
                  disabled={busy}
                  onClick={() => setConfirmDelete(true)}
                >
                  Excluir outfit
                </Button>
              )}
            </Reveal>
          )}
        </>
      )}
    </Reveal>
  );
}
