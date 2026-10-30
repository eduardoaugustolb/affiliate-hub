"use client";
import { useRouter } from "next/navigation";
import { useRef, useState, useTransition } from "react";
import {
  deleteInstagramCampaignAction,
  previewInstagramCampaignAction,
  saveInstagramCampaignAction,
} from "@/app/admin/instagram-actions";
import { BrandIcon } from "@/components/ui/brand-icon";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Select } from "@/components/ui/select";
import { TextField } from "@/components/ui/text-field";
import { actionRequest } from "@/lib/admin";
import type {
  InstagramCampaign,
  InstagramConfiguration,
  InstagramData,
  InstagramPreview,
  InstagramRule,
} from "@/lib/instagram";
import { ConfirmDialog } from "./confirm-dialog";

type RuleDraft = Omit<InstagramRule, "triggers"> & {
  key: string;
  expressions: string;
};
type Draft = Omit<InstagramConfiguration, "rules" | "outfits"> & {
  id: string;
  outfits: { key: string; number: string; code: string }[];
  rules: RuleDraft[];
};
const newRule = (): RuleDraft => ({
  key: crypto.randomUUID(),
  expressions: "",
  target: "all",
  privateReply: "",
  publicReply: "",
});
function createDraft(campaign?: InstagramCampaign): Draft {
  const configuration = campaign?.configuration;
  return {
    id: campaign?.id ?? crypto.randomUUID(),
    name: configuration?.name ?? "",
    enabled: configuration?.enabled ?? false,
    source: configuration?.source ?? "comment",
    postUrl: configuration?.postUrl ?? "",
    outfits:
      configuration?.outfits.map((outfit) => ({
        ...outfit,
        key: crypto.randomUUID(),
      })) ?? [],
    rules: configuration?.rules.map((rule) => ({
      ...rule,
      key: crypto.randomUUID(),
      expressions: rule.triggers.join("\n"),
    })) ?? [newRule()],
  };
}
function configuration(draft: Draft): InstagramConfiguration {
  const rules = draft.rules.map(
    ({ expressions, target, privateReply, publicReply }) => ({
      triggers: expressions
        .split(/[\n,]+/)
        .map((value) => value.trim())
        .filter(Boolean),
      target,
      ...(privateReply?.trim() ? { privateReply: privateReply.trim() } : {}),
      ...(draft.source === "comment" && publicReply?.trim()
        ? { publicReply: publicReply.trim() }
        : {}),
    }),
  );
  if (rules.some((rule) => !rule.privateReply && !rule.publicReply))
    throw new Error("Adicione ao menos uma resposta em cada regra.");
  return {
    name: draft.name.trim(),
    enabled: draft.enabled,
    source: draft.source,
    postUrl: draft.source === "message" ? null : draft.postUrl,
    outfits: draft.outfits.map(({ number, code }) => ({
      number,
      code: code.trim().toUpperCase(),
    })),
    rules,
  };
}
const statusLabels: Record<string, string> = {
  done: "Concluído",
  attempts_exhausted: "Limite de tentativas atingido",
  accepted: "Aceito pela Meta",
  rejected: "Recusado",
  unknown: "Resultado incerto",
  inflight: "Em envio",
  pending: "Na fila",
  processing: "Processando",
  completed: "Concluído",
  processed: "Processado",
  ignored: "Ignorado",
  expired: "Prazo expirado",
  failed: "Falha",
};

export function InstagramAdmin({
  data,
  onError,
}: {
  data: InstagramData;
  onError: (error: unknown) => void;
}) {
  const router = useRouter();
  const [refreshing, startTransition] = useTransition();
  const [busy, setBusy] = useState(false);
  const [draft, setDraft] = useState<Draft | null>(null);
  const [notice, setNotice] = useState("");
  const [error, setError] = useState("");
  const [sample, setSample] = useState("");
  const [preview, setPreview] = useState<InstagramPreview | null>(null);
  const [deleting, setDeleting] = useState<InstagramCampaign | null>(null);
  const form = useRef<HTMLFormElement>(null);
  const disabled = busy || refreshing;
  function refresh() {
    startTransition(() => router.refresh());
  }
  function edit(campaign?: InstagramCampaign) {
    setDraft(createDraft(campaign));
    setPreview(null);
    setSample("");
    setError("");
    setNotice("");
  }
  function update(patch: Partial<Draft>) {
    setDraft((current) => (current ? { ...current, ...patch } : current));
    setPreview(null);
  }
  function updateRule(key: string, patch: Partial<RuleDraft>) {
    if (draft)
      update({
        rules: draft.rules.map((rule) =>
          rule.key === key ? { ...rule, ...patch } : rule,
        ),
      });
  }
  async function execute(operation: () => Promise<void>) {
    setBusy(true);
    setError("");
    setNotice("");
    try {
      await operation();
    } catch (reason) {
      setError(
        reason instanceof Error ? reason.message : "Não foi possível concluir.",
      );
      onError(reason);
    } finally {
      setBusy(false);
    }
  }
  if (!data.configured)
    return (
      <section className="min-w-0 rounded-3xl border border-[#ffffff12] bg-[#20211f] p-6 max-[639px]:p-[1.15rem] grid min-w-0 gap-5 [&>*]:min-w-0 mt-8 max-w-180 [&>svg]:text-[#ffa631] [&_h2]:font-[family-name:var(--font-black-hem)] [&_h2]:text-[2rem] [&_p]:leading-[1.7]">
        <BrandIcon name="info" className="size-8" />
        <h2>Instagram indisponível</h2>
        <p className="text-[0.8rem] leading-[1.65] text-[#a5a8a0]">
          {data.error ||
            "A integração com o Instagram ainda não está configurada. Configure a conta profissional na API para gerenciar campanhas por aqui."}
        </p>
        <div>
          <Button variant="outline" onClick={refresh} disabled={disabled}>
            Verificar novamente
          </Button>
        </div>
      </section>
    );
  return (
    <div className="grid min-w-0 gap-5 [&>*]:min-w-0 [&_h3]:font-[family-name:var(--font-black-hem)] [&_h3]:text-[1.45rem] [&_h3]:leading-[1.2]">
      <div className="flex flex-wrap items-center gap-3 justify-between max-[899px]:gap-4 min-[640px]:max-[899px]:items-start [&_h2]:font-[family-name:var(--font-black-hem)] [&_h2]:text-[1.9rem] [&_p]:mt-1 max-[639px]:flex-col max-[639px]:items-stretch max-[639px]:[&>div:last-child]:grid max-[639px]:[&>div:last-child]:w-full max-[639px]:[&>div:last-child]:grid-cols-2 max-[639px]:[&>div:last-child]:gap-2">
        <div>
          <h2>Campanhas do Instagram</h2>
          <p className="text-[0.8rem] leading-[1.65] text-[#a5a8a0]">
            @{data.username} · Respostas para comentários e mensagens recebidas.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <Button variant="outline" disabled={disabled} onClick={refresh}>
            Atualizar
          </Button>
          <Button disabled={disabled} onClick={() => edit()}>
            + Nova campanha
          </Button>
        </div>
      </div>
      {(error || data.error) && (
        <p
          role="alert"
          className="rounded-2xl border border-[#b9f87945] bg-[#b9f87908] p-4 [overflow-wrap:anywhere] [&[role=alert]]:border-[#ffa63160] [&[role=alert]]:bg-[#ffa63108] [&[role=alert]]:text-[#ffd6a0]"
        >
          {error || data.error}
        </p>
      )}
      {notice && (
        <output className="rounded-2xl border border-[#b9f87945] bg-[#b9f87908] p-4 [overflow-wrap:anywhere] [&[role=alert]]:border-[#ffa63160] [&[role=alert]]:bg-[#ffa63108] [&[role=alert]]:text-[#ffd6a0]">
          {notice}
        </output>
      )}
      {draft && (
        <form
          ref={form}
          className="min-w-0 rounded-3xl border border-[#ffffff12] bg-[#20211f] p-6 max-[639px]:p-[1.15rem] grid min-w-0 gap-5 [&>*]:min-w-0"
          onSubmit={(event) => {
            event.preventDefault();
            void execute(async () => {
              const saved = await actionRequest(
                saveInstagramCampaignAction(draft.id, configuration(draft)),
              );
              setNotice(
                `Campanha salva${saved.configuration.enabled ? " e ativada" : " como pausada"}.`,
              );
              setDraft(null);
              setPreview(null);
              refresh();
            });
          }}
        >
          <div className="flex flex-wrap items-center gap-3 justify-between">
            <h3>
              {data.campaigns.some((campaign) => campaign.id === draft.id)
                ? "Editar campanha"
                : "Nova campanha"}
            </h3>
            <span className="inline-block whitespace-nowrap rounded-[20px] bg-[#ffffff0a] px-[0.65rem] py-[0.4rem] text-[0.7rem] data-[status=active]:bg-[#b9f87915] data-[status=active]:text-[#b9f879] data-[status=inactive]:bg-[#ffa63115] data-[status=inactive]:text-[#ffa631]">
              {draft.enabled ? "Ativa ao salvar" : "Pausada ao salvar"}
            </span>
          </div>
          <fieldset
            className="min-w-0 border-0 p-0 grid min-w-0 gap-5 [&>*]:min-w-0"
            disabled={disabled}
          >
            <div className="grid min-w-0 grid-cols-[repeat(auto-fit,minmax(min(100%,280px),1fr))] gap-5 [&>*]:min-w-0">
              <TextField
                label="Nome da campanha"
                name="name"
                required
                maxLength={160}
                value={draft.name}
                onChange={(event) => update({ name: event.target.value })}
              />
              <Select
                label="Responder a"
                name="source"
                value={draft.source}
                disabled={disabled}
                options={[
                  { value: "comment", label: "Comentários de um post" },
                  { value: "message", label: "Mensagens recebidas (inbox)" },
                ]}
                onChange={(source) =>
                  update({
                    source: source as Draft["source"],
                    rules: draft.rules.map((rule) => ({
                      ...rule,
                      publicReply: source === "message" ? "" : rule.publicReply,
                    })),
                  })
                }
              />
            </div>
            {draft.source === "comment" ? (
              <TextField
                label="Link do post ou reel"
                name="postUrl"
                type="url"
                required
                placeholder="https://www.instagram.com/p/.../"
                value={draft.postUrl ?? ""}
                onChange={(event) => update({ postUrl: event.target.value })}
                hint="Uma campanha por post. Use o link de uma publicação da conta conectada."
              />
            ) : (
              <p className="text-[0.8rem] leading-[1.65] text-[#a5a8a0]">
                Uma campanha de mensagens por conta. As respostas são enviadas
                apenas por mensagem privada.
              </p>
            )}
            <Checkbox
              label="Ativar respostas automáticas ao salvar"
              name="enabled"
              value="true"
              checked={draft.enabled}
              disabled={disabled}
              onCheckedChange={(enabled) => update({ enabled })}
            />
            <section
              className="border-t border-[#ece9e225] pt-6 [&_h3]:mb-2 grid min-w-0 gap-5 [&>*]:min-w-0"
              aria-label="Outfits da campanha"
            >
              <div className="flex flex-wrap items-center gap-3 justify-between">
                <div>
                  <h3>Outfits da campanha</h3>
                  <p className="text-[0.8rem] leading-[1.65] text-[#a5a8a0]">
                    Associe os números usados no post aos códigos dos seus
                    outfits.
                  </p>
                </div>
                <Button
                  variant="outline"
                  disabled={disabled || draft.outfits.length >= 30}
                  onClick={() => {
                    const next = Array.from({ length: 99 }, (_, index) =>
                      String(index + 1).padStart(2, "0"),
                    ).find(
                      (number) =>
                        !draft.outfits.some(
                          (outfit) => outfit.number === number,
                        ),
                    );
                    update({
                      outfits: [
                        ...draft.outfits,
                        {
                          key: crypto.randomUUID(),
                          number: next ?? "01",
                          code: "",
                        },
                      ],
                    });
                  }}
                >
                  + Adicionar outfit
                </Button>
              </div>
              {!draft.outfits.length && (
                <p className="text-[0.8rem] leading-[1.65] text-[#a5a8a0]">
                  Adicione outfits para usar links e nomes nas respostas.
                  Respostas de texto livre também são permitidas.
                </p>
              )}
              {draft.outfits.map((outfit, index) => (
                <div
                  key={outfit.key}
                  className="grid grid-cols-[5rem_minmax(12rem,1fr)_auto] items-end gap-4 [&_.app-button]:px-3! [&_svg]:size-4 max-[899px]:grid-cols-[4rem_minmax(0,1fr)] max-[899px]:[&>div:last-child]:col-span-full"
                >
                  <TextField
                    label="Número"
                    name={`number-${outfit.key}`}
                    value={outfit.number}
                    required
                    pattern="(0[1-9]|[1-9][0-9])"
                    maxLength={2}
                    inputMode="numeric"
                    onChange={(event) =>
                      update({
                        outfits: draft.outfits.map((item) =>
                          item.key === outfit.key
                            ? { ...item, number: event.target.value }
                            : item,
                        ),
                        rules: draft.rules.map((rule) =>
                          rule.target === outfit.number
                            ? { ...rule, target: event.target.value }
                            : rule,
                        ),
                      })
                    }
                  />
                  <TextField
                    label="Código do outfit"
                    name={`code-${outfit.key}`}
                    value={outfit.code}
                    required
                    pattern="OUT-[A-Fa-f0-9]{16}"
                    placeholder="OUT-0123456789ABCDEF"
                    onChange={(event) =>
                      update({
                        outfits: draft.outfits.map((item) =>
                          item.key === outfit.key
                            ? {
                                ...item,
                                code: event.target.value.toUpperCase(),
                              }
                            : item,
                        ),
                      })
                    }
                  />
                  <div className="flex flex-wrap items-center gap-3">
                    <Button
                      variant="outline"
                      aria-label={`Mover outfit ${outfit.number} para cima`}
                      disabled={disabled || index === 0}
                      onClick={() => {
                        const outfits = [...draft.outfits];
                        [outfits[index - 1], outfits[index]] = [
                          outfits[index],
                          outfits[index - 1],
                        ];
                        update({ outfits });
                      }}
                    >
                      <BrandIcon name="arrow-up" />
                    </Button>
                    <Button
                      variant="outline"
                      aria-label={`Mover outfit ${outfit.number} para baixo`}
                      disabled={disabled || index === draft.outfits.length - 1}
                      onClick={() => {
                        const outfits = [...draft.outfits];
                        [outfits[index + 1], outfits[index]] = [
                          outfits[index],
                          outfits[index + 1],
                        ];
                        update({ outfits });
                      }}
                    >
                      <BrandIcon name="arrow-down" />
                    </Button>
                    <Button
                      variant="text"
                      disabled={disabled}
                      onClick={() =>
                        update({
                          outfits: draft.outfits.filter(
                            (item) => item.key !== outfit.key,
                          ),
                          rules: draft.rules.map((rule) =>
                            rule.target === outfit.number
                              ? {
                                  ...rule,
                                  target: "all",
                                  privateReply: "",
                                  publicReply: "",
                                }
                              : rule,
                          ),
                        })
                      }
                    >
                      Remover
                    </Button>
                  </div>
                </div>
              ))}
            </section>
            <section
              className="border-t border-[#ece9e225] pt-6 [&_h3]:mb-2 grid min-w-0 gap-5 [&>*]:min-w-0"
              aria-label="Regras de resposta"
            >
              <div className="flex flex-wrap items-center gap-3 justify-between">
                <div>
                  <h3>Expressões e respostas</h3>
                  <p className="text-[0.8rem] leading-[1.65] text-[#a5a8a0]">
                    A expressão inteira deve corresponder. Maiúsculas e espaços
                    extras são ignorados.
                  </p>
                </div>
                <Button
                  variant="outline"
                  disabled={disabled || draft.rules.length >= 50}
                  onClick={() => update({ rules: [...draft.rules, newRule()] })}
                >
                  + Adicionar regra
                </Button>
              </div>
              {draft.rules.map((rule, index) => (
                <fieldset
                  key={rule.key}
                  className="grid min-w-0 gap-5 [&>*]:min-w-0 rounded-2xl border border-[#ffffff20] bg-[#08090835] p-4 max-[639px]:p-3 [&_legend]:px-2 [&_legend]:py-1 [&_legend]:text-[0.8rem] [&_legend]:text-[#b9f879]"
                >
                  <legend>Regra {index + 1}</legend>
                  <div className="grid min-w-0 grid-cols-[repeat(auto-fit,minmax(min(100%,280px),1fr))] gap-5 [&>*]:min-w-0">
                    <label>
                      Expressões que acionam a resposta
                      <textarea
                        className="min-h-24 w-full max-w-full resize-y max-[639px]:text-base rounded-xl border border-[#ffffff25] bg-[#171815] p-[0.85rem] leading-[1.6] text-[#f5f6f0]"
                        name={`triggers-${rule.key}`}
                        required
                        rows={3}
                        placeholder={"quero os links\nmanda os looks"}
                        value={rule.expressions}
                        onChange={(event) =>
                          updateRule(rule.key, {
                            expressions: event.target.value,
                          })
                        }
                      />
                      <span className="text-[0.7rem] leading-[1.65] text-[#a5a8a0]">
                        Uma por linha ou separadas por vírgula. Até 30 por
                        regra.
                      </span>
                    </label>
                    <div className="grid min-w-0 gap-5 [&>*]:min-w-0">
                      <Select
                        label="Outfits da resposta"
                        name={`target-${rule.key}`}
                        value={rule.target}
                        disabled={disabled}
                        options={[
                          {
                            value: "all",
                            label: "Todos os outfits da campanha",
                          },
                          ...draft.outfits.map((outfit) => ({
                            value: outfit.number,
                            label: `Outfit ${outfit.number}`,
                          })),
                        ]}
                        onChange={(target) => updateRule(rule.key, { target })}
                      />
                      <p className="text-[0.7rem] leading-[1.65] text-[#a5a8a0]">
                        {rule.target === "all"
                          ? "Variável disponível: {lista_outfits}"
                          : "Variáveis disponíveis: {numero}, {nome}, {url}"}
                      </p>
                    </div>
                  </div>
                  <div className="grid min-w-0 grid-cols-[repeat(auto-fit,minmax(min(100%,280px),1fr))] gap-5 [&>*]:min-w-0">
                    <label>
                      Resposta por mensagem privada
                      <textarea
                        className="min-h-24 w-full max-w-full resize-y max-[639px]:text-base rounded-xl border border-[#ffffff25] bg-[#171815] p-[0.85rem] leading-[1.6] text-[#f5f6f0]"
                        name={`private-${rule.key}`}
                        rows={4}
                        required={draft.source === "message"}
                        value={rule.privateReply ?? ""}
                        onChange={(event) =>
                          updateRule(rule.key, {
                            privateReply: event.target.value,
                          })
                        }
                        placeholder={
                          rule.target === "all"
                            ? "Aqui estão os looks: {lista_outfits}"
                            : "Outfit {numero}: {nome} — {url}"
                        }
                      />
                      <span className="text-[0.7rem] leading-[1.65] text-[#a5a8a0]">
                        {
                          new TextEncoder().encode(rule.privateReply ?? "")
                            .length
                        }
                        /1000 bytes antes de preencher as variáveis.
                      </span>
                    </label>
                    {draft.source === "comment" && (
                      <label>
                        Resposta pública no comentário
                        <textarea
                          className="min-h-24 w-full max-w-full resize-y max-[639px]:text-base rounded-xl border border-[#ffffff25] bg-[#171815] p-[0.85rem] leading-[1.6] text-[#f5f6f0]"
                          name={`public-${rule.key}`}
                          rows={4}
                          value={rule.publicReply ?? ""}
                          onChange={(event) =>
                            updateRule(rule.key, {
                              publicReply: event.target.value,
                            })
                          }
                          placeholder="Te enviei os links por mensagem!"
                        />
                        <span className="text-[0.7rem] leading-[1.65] text-[#a5a8a0]">
                          Opcional quando há resposta privada. Enviada após a
                          Meta aceitar a mensagem privada.
                        </span>
                      </label>
                    )}
                  </div>
                  {draft.rules.length > 1 && (
                    <div>
                      <Button
                        variant="text"
                        disabled={disabled}
                        onClick={() =>
                          update({
                            rules: draft.rules.filter(
                              (item) => item.key !== rule.key,
                            ),
                          })
                        }
                      >
                        Remover regra {index + 1}
                      </Button>
                    </div>
                  )}
                </fieldset>
              ))}
            </section>
            <section
              className="border-t border-[#ece9e225] pt-6 [&_h3]:mb-2 grid min-w-0 gap-5 [&>*]:min-w-0"
              aria-label="Prévia da resposta"
            >
              <h3>Teste antes de ativar</h3>
              <p className="text-[0.8rem] leading-[1.65] text-[#a5a8a0]">
                A prévia usa nomes e links reais dos outfits. Nenhuma mensagem é
                enviada.
              </p>
              <div className="grid grid-cols-[minmax(0,1fr)_auto] items-end gap-4 max-[639px]:grid-cols-[minmax(0,1fr)]">
                <TextField
                  label="Comentário ou mensagem de exemplo"
                  name="sample"
                  value={sample}
                  maxLength={4000}
                  onChange={(event) => {
                    setSample(event.target.value);
                    setPreview(null);
                  }}
                  placeholder="quero os links"
                />
                <Button
                  variant="outline"
                  disabled={disabled || !sample.trim()}
                  onClick={() => {
                    if (!form.current?.reportValidity()) return;
                    void execute(async () => {
                      setPreview(
                        await actionRequest(
                          previewInstagramCampaignAction(
                            configuration(draft),
                            sample,
                          ),
                        ),
                      );
                    });
                  }}
                >
                  Gerar prévia
                </Button>
              </div>
              {preview && (
                <div
                  className="grid gap-4 rounded-2xl border border-[#b9f87930] bg-[#b9f8790a] p-4 [&_h4]:mb-[0.6rem] [&_h4]:text-xs [&_h4]:text-[#b9f879] [&_p]:whitespace-pre-wrap [&_p]:text-[0.85rem] [&_p]:leading-[1.7] [&_small]:mt-2 [&_small]:block [&_small]:text-[0.65rem] [&_small]:text-[#a5a8a0]"
                  aria-live="polite"
                >
                  {!preview.matched ? (
                    <p>Nenhuma regra corresponde a essa expressão.</p>
                  ) : (
                    <>
                      {preview.privateReply && (
                        <div>
                          <h4>Mensagem privada</h4>
                          <p>{preview.privateReply}</p>
                          <small>
                            {
                              new TextEncoder().encode(preview.privateReply)
                                .length
                            }{" "}
                            bytes
                          </small>
                        </div>
                      )}
                      {preview.publicReply && (
                        <div>
                          <h4>Comentário público</h4>
                          <p>{preview.publicReply}</p>
                          <small>
                            {
                              new TextEncoder().encode(preview.publicReply)
                                .length
                            }{" "}
                            bytes
                          </small>
                        </div>
                      )}
                    </>
                  )}
                </div>
              )}
            </section>
            <div className="flex flex-wrap items-center gap-3 max-[639px]:grid max-[639px]:w-full max-[639px]:grid-cols-2 max-[639px]:gap-2">
              <Button type="submit" disabled={disabled}>
                {busy ? "Salvando…" : "Salvar campanha"}
              </Button>
              <Button
                variant="outline"
                disabled={disabled}
                onClick={() => {
                  setDraft(null);
                  setPreview(null);
                  setError("");
                }}
              >
                Cancelar
              </Button>
            </div>
          </fieldset>
        </form>
      )}
      <section
        className="grid min-w-0 gap-5 [&>*]:min-w-0"
        aria-label="Campanhas cadastradas"
      >
        {!data.campaigns.length ? (
          <div className="min-w-0 rounded-3xl border border-[#ffffff12] bg-[#20211f] p-6 max-[639px]:p-[1.15rem] grid min-w-0 gap-5 [&>*]:min-w-0">
            <h3>Sua primeira campanha</h3>
            <p className="text-[0.8rem] leading-[1.65] text-[#a5a8a0]">
              Defina o post, os outfits e as expressões que devem receber uma
              resposta.
            </p>
            <div>
              <Button
                variant="outline"
                disabled={disabled}
                onClick={() => edit()}
              >
                Criar campanha
              </Button>
            </div>
          </div>
        ) : (
          data.campaigns.map((campaign) => (
            <article
              key={campaign.id}
              className="min-w-0 rounded-3xl border border-[#ffffff12] bg-[#20211f] p-6 max-[639px]:p-[1.15rem] flex items-center justify-between gap-6 [&>div:first-child]:gap-[0.6rem] max-[899px]:flex-col max-[899px]:items-stretch max-[639px]:[&>div:last-child]:grid max-[639px]:[&>div:last-child]:grid-cols-3 max-[639px]:[&>div:last-child]:gap-[0.4rem] max-[639px]:[&>div:last-child_.app-button]:min-w-0! max-[639px]:[&>div:last-child_.app-button]:px-2!"
            >
              <div className="grid min-w-0 gap-5 [&>*]:min-w-0">
                <div className="flex flex-wrap items-center gap-3">
                  <h3>{campaign.configuration.name}</h3>
                  <span
                    className="inline-block whitespace-nowrap rounded-[20px] bg-[#ffffff0a] px-[0.65rem] py-[0.4rem] text-[0.7rem] data-[status=active]:bg-[#b9f87915] data-[status=active]:text-[#b9f879] data-[status=inactive]:bg-[#ffa63115] data-[status=inactive]:text-[#ffa631]"
                    data-status={
                      campaign.configuration.enabled ? "active" : "inactive"
                    }
                  >
                    {campaign.configuration.enabled ? "Ativa" : "Pausada"}
                  </span>
                </div>
                <p className="text-[0.8rem] leading-[1.65] text-[#a5a8a0]">
                  {campaign.configuration.source === "comment"
                    ? "Comentários de um post"
                    : "Mensagens recebidas"}{" "}
                  · {campaign.configuration.outfits.length} outfits ·{" "}
                  {campaign.configuration.rules.length} regras
                </p>
                {campaign.configuration.postUrl && (
                  <a
                    className="inline-flex items-center gap-2 text-xs text-[#b9f879] [&_svg]:size-[0.85rem]"
                    href={campaign.configuration.postUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    Abrir post <BrandIcon name="external-link" />
                  </a>
                )}
              </div>
              <div className="flex flex-wrap items-center gap-3">
                <Button
                  variant="outline"
                  disabled={disabled}
                  onClick={() => edit(campaign)}
                >
                  Editar
                </Button>
                <Button
                  variant="outline"
                  disabled={disabled}
                  onClick={() => {
                    void execute(async () => {
                      await actionRequest(
                        saveInstagramCampaignAction(campaign.id, {
                          ...campaign.configuration,
                          enabled: !campaign.configuration.enabled,
                        }),
                      );
                      setNotice(
                        campaign.configuration.enabled
                          ? "Campanha pausada."
                          : "Campanha ativada.",
                      );
                      refresh();
                    });
                  }}
                >
                  {campaign.configuration.enabled ? "Pausar" : "Ativar"}
                </Button>
                <Button
                  variant="text"
                  disabled={disabled}
                  onClick={() => setDeleting(campaign)}
                >
                  Excluir
                </Button>
              </div>
            </article>
          ))
        )}
      </section>
      <section
        className="min-w-0 rounded-3xl border border-[#ffffff12] bg-[#20211f] p-6 max-[639px]:p-[1.15rem] grid min-w-0 gap-5 [&>*]:min-w-0"
        aria-label="Histórico do Instagram"
      >
        <div>
          <h3>Atividade recente</h3>
          <p className="text-[0.8rem] leading-[1.65] text-[#a5a8a0]">
            Até 100 eventos e envios recentes. A aceitação pela Meta não
            confirma a leitura.
          </p>
        </div>
        {data.history.length ? (
          <div className="min-w-0 overflow-x-auto [&_table]:w-full [&_table]:min-w-[650px] [&_table]:border-collapse [&_table]:text-left [&_table]:text-sm [&_th]:text-[0.7rem] [&_th]:font-normal [&_th]:text-[#a5a8a0] [&_th]:border-b [&_th]:border-[#ffffff12] [&_th]:px-3 [&_th]:py-[1.1rem] [&_td]:border-b [&_td]:border-[#ffffff12] [&_td]:px-3 [&_td]:py-[1.1rem]">
            <table>
              <thead>
                <tr>
                  <th>Quando</th>
                  <th>Canal</th>
                  <th>Ação</th>
                  <th>Estado</th>
                  <th>Detalhe</th>
                </tr>
              </thead>
              <tbody>
                {data.history.map((entry) => (
                  <tr key={`${entry.type}-${entry.id}`}>
                    <td>
                      {entry.createdAt &&
                      Number.isFinite(Date.parse(entry.createdAt))
                        ? new Date(entry.createdAt).toLocaleString("pt-BR", {
                            timeZone: "America/Sao_Paulo",
                            dateStyle: "short",
                            timeStyle: "short",
                          })
                        : "—"}
                    </td>
                    <td>
                      {entry.kind === "comment" ? "Comentário" : "Mensagem"}
                    </td>
                    <td>
                      {entry.type === "event"
                        ? "Evento recebido"
                        : entry.action === "public"
                          ? "Resposta pública"
                          : "Mensagem privada"}
                    </td>
                    <td>{statusLabels[entry.status] ?? entry.status}</td>
                    <td>
                      {statusLabels[entry.result] ??
                        (entry.result || entry.code || "—")}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <p className="text-[0.8rem] leading-[1.65] text-[#a5a8a0]">
            Ainda não há atividade registrada.
          </p>
        )}
      </section>
      {deleting && (
        <ConfirmDialog
          busy={disabled}
          title={`Excluir ${deleting?.configuration.name ?? "campanha"}?`}
          onCancel={() => setDeleting(null)}
          onConfirm={() => {
            if (!deleting) return;
            void execute(async () => {
              await actionRequest(deleteInstagramCampaignAction(deleting.id));
              if (draft?.id === deleting.id) setDraft(null);
              setDeleting(null);
              setNotice("Campanha excluída.");
              refresh();
            });
          }}
        >
          A campanha será removida e deixará de responder a novos eventos. O
          histórico de atividade será preservado.
        </ConfirmDialog>
      )}
    </div>
  );
}
