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
      <section className="admin-panel admin-stack admin-instagram-unavailable">
        <BrandIcon name="info" className="size-8" />
        <h2>Instagram indisponível</h2>
        <p className="admin-muted">
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
    <div className="admin-stack admin-instagram">
      <div className="admin-row admin-between admin-products-toolbar">
        <div>
          <h2>Campanhas do Instagram</h2>
          <p className="admin-muted">
            @{data.username} · Respostas para comentários e mensagens recebidas.
          </p>
        </div>
        <div className="admin-row">
          <Button variant="outline" disabled={disabled} onClick={refresh}>
            Atualizar
          </Button>
          <Button disabled={disabled} onClick={() => edit()}>
            + Nova campanha
          </Button>
        </div>
      </div>
      {(error || data.error) && (
        <p role="alert" className="admin-notice">
          {error || data.error}
        </p>
      )}
      {notice && <output className="admin-notice">{notice}</output>}
      {draft && (
        <form
          ref={form}
          className="admin-panel admin-stack"
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
          <div className="admin-row admin-between">
            <h3>
              {data.campaigns.some((campaign) => campaign.id === draft.id)
                ? "Editar campanha"
                : "Nova campanha"}
            </h3>
            <span className="admin-badge">
              {draft.enabled ? "Ativa ao salvar" : "Pausada ao salvar"}
            </span>
          </div>
          <fieldset
            className="admin-form-fields admin-stack"
            disabled={disabled}
          >
            <div className="admin-grid">
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
              <p className="admin-muted">
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
              className="admin-divider admin-stack"
              aria-label="Outfits da campanha"
            >
              <div className="admin-row admin-between">
                <div>
                  <h3>Outfits da campanha</h3>
                  <p className="admin-muted">
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
                <p className="admin-muted">
                  Adicione outfits para usar links e nomes nas respostas.
                  Respostas de texto livre também são permitidas.
                </p>
              )}
              {draft.outfits.map((outfit, index) => (
                <div key={outfit.key} className="admin-outfit-mapping">
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
                  <div className="admin-row">
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
              className="admin-divider admin-stack"
              aria-label="Regras de resposta"
            >
              <div className="admin-row admin-between">
                <div>
                  <h3>Expressões e respostas</h3>
                  <p className="admin-muted">
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
                  className="admin-stack admin-instagram-rule"
                >
                  <legend>Regra {index + 1}</legend>
                  <div className="admin-grid">
                    <label>
                      Expressões que acionam a resposta
                      <textarea
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
                      <span className="admin-muted admin-field-hint">
                        Uma por linha ou separadas por vírgula. Até 30 por
                        regra.
                      </span>
                    </label>
                    <div className="admin-stack">
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
                      <p className="admin-muted admin-field-hint">
                        {rule.target === "all"
                          ? "Variável disponível: {lista_outfits}"
                          : "Variáveis disponíveis: {numero}, {nome}, {url}"}
                      </p>
                    </div>
                  </div>
                  <div className="admin-grid">
                    <label>
                      Resposta por mensagem privada
                      <textarea
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
                      <span className="admin-muted admin-field-hint">
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
                        <span className="admin-muted admin-field-hint">
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
              className="admin-divider admin-stack"
              aria-label="Prévia da resposta"
            >
              <h3>Teste antes de ativar</h3>
              <p className="admin-muted">
                A prévia usa nomes e links reais dos outfits. Nenhuma mensagem é
                enviada.
              </p>
              <div className="admin-preview-controls">
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
                <div className="admin-preview-result" aria-live="polite">
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
            <div className="admin-row admin-form-actions">
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
      <section className="admin-stack" aria-label="Campanhas cadastradas">
        {!data.campaigns.length ? (
          <div className="admin-panel admin-stack">
            <h3>Sua primeira campanha</h3>
            <p className="admin-muted">
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
              className="admin-panel admin-campaign-card"
            >
              <div className="admin-stack">
                <div className="admin-row">
                  <h3>{campaign.configuration.name}</h3>
                  <span
                    className="admin-badge"
                    data-status={
                      campaign.configuration.enabled ? "active" : "inactive"
                    }
                  >
                    {campaign.configuration.enabled ? "Ativa" : "Pausada"}
                  </span>
                </div>
                <p className="admin-muted">
                  {campaign.configuration.source === "comment"
                    ? "Comentários de um post"
                    : "Mensagens recebidas"}{" "}
                  · {campaign.configuration.outfits.length} outfits ·{" "}
                  {campaign.configuration.rules.length} regras
                </p>
                {campaign.configuration.postUrl && (
                  <a
                    className="admin-campaign-url"
                    href={campaign.configuration.postUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    Abrir post <BrandIcon name="external-link" />
                  </a>
                )}
              </div>
              <div className="admin-row">
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
        className="admin-panel admin-stack"
        aria-label="Histórico do Instagram"
      >
        <div>
          <h3>Atividade recente</h3>
          <p className="admin-muted">
            Até 100 eventos e envios recentes. A aceitação pela Meta não
            confirma a leitura.
          </p>
        </div>
        {data.history.length ? (
          <div className="admin-table">
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
          <p className="admin-muted">Ainda não há atividade registrada.</p>
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
