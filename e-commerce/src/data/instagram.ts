import "server-only";
import { AdminError } from "@/lib/admin";
import type {
  InstagramCampaign,
  InstagramConfiguration,
  InstagramData,
  InstagramHistory,
  InstagramPreview,
} from "@/lib/instagram";
import { requireAdmin } from "./auth";
import { apiJson, apiResponse, sessionHeader } from "./transport";
import { choice, invalid, record, text } from "./validation";

function configurationDTO(input: unknown): InstagramConfiguration {
  const data = record(input);
  const source = choice(data.source, ["comment", "message"]);
  if (
    typeof data.enabled !== "boolean" ||
    !Array.isArray(data.outfits) ||
    data.outfits.length > 30 ||
    !Array.isArray(data.rules) ||
    !data.rules.length ||
    data.rules.length > 50
  )
    return invalid();
  const numbers = new Set<string>();
  const outfits = data.outfits.map((value) => {
    const outfit = record(value);
    const number = text(outfit.number, 2);
    const code = text(outfit.code, 20).toUpperCase();
    if (
      !/^\d{2}$/.test(number) ||
      number === "00" ||
      numbers.has(number) ||
      !/^OUT-[A-F0-9]{16}$/.test(code)
    )
      return invalid();
    numbers.add(number);
    return { number, code };
  });
  const triggers = new Set<string>();
  const rules = data.rules.map((value) => {
    const rule = record(value);
    const target = text(rule.target, 3);
    if (target !== "all" && !numbers.has(target)) return invalid();
    if (
      !Array.isArray(rule.triggers) ||
      !rule.triggers.length ||
      rule.triggers.length > 30
    )
      return invalid();
    const expressions = rule.triggers.map((value) => {
      const expression = text(value);
      const normalized = expression
        .replace(/\s+/gu, " ")
        .toLocaleLowerCase("pt-BR");
      if (triggers.has(normalized)) return invalid();
      triggers.add(normalized);
      return expression;
    });
    const reply = (input: unknown) => {
      if (input === undefined) return undefined;
      const template = text(input, 1000);
      if (new TextEncoder().encode(template).length > 1000)
        throw new AdminError(
          400,
          "Cada resposta deve ter até 1000 bytes em UTF-8.",
        );
      const allowed =
        target === "all" ? ["lista_outfits"] : ["numero", "nome", "url"];
      if (
        /[{}]/.test(
          template.replace(/\{([^{}]+)\}/g, (match, key: string) =>
            allowed.includes(key) ? "" : match,
          ),
        ) ||
        (template.includes("{") && !outfits.length)
      )
        throw new AdminError(
          400,
          "Confira as variáveis da resposta e os outfits selecionados.",
        );
      return template;
    };
    const privateReply = reply(rule.privateReply);
    const publicReply = reply(rule.publicReply);
    if (!privateReply && !publicReply)
      throw new AdminError(400, "Adicione ao menos uma resposta por regra.");
    if (source === "message" && (!privateReply || publicReply))
      throw new AdminError(
        400,
        "Campanhas de mensagens devem responder apenas por mensagem privada.",
      );
    return {
      triggers: expressions,
      target,
      ...(privateReply ? { privateReply } : {}),
      ...(publicReply ? { publicReply } : {}),
    };
  });
  let postUrl: string | null = null;
  if (source === "comment") {
    try {
      const url = new URL(text(data.postUrl, 2048));
      if (
        url.protocol !== "https:" ||
        !["instagram.com", "www.instagram.com"].includes(url.hostname) ||
        url.port ||
        url.username ||
        url.password ||
        !/^\/(p|reel)\/[A-Za-z0-9_-]+\/?$/.test(url.pathname)
      )
        return invalid();
      postUrl = `https://www.instagram.com${url.pathname.replace(/\/$/, "")}/`;
    } catch {
      return invalid();
    }
  } else if (data.postUrl !== null) return invalid();
  return {
    name: text(data.name),
    enabled: data.enabled,
    source,
    postUrl,
    outfits,
    rules,
  };
}
function campaignId(input: unknown) {
  const id = text(input, 100);
  if (!/^[a-zA-Z0-9_-]+$/.test(id)) return invalid();
  return id;
}
function campaignDTO(input: unknown): InstagramCampaign {
  const data = record(input);
  return {
    id: campaignId(data.id),
    configuration: configurationDTO(data.configuration),
  };
}
function historyDTO(input: unknown): InstagramHistory {
  const data = record(input);
  const field = (key: string) =>
    typeof data[key] === "string" ? (data[key] as string).slice(0, 200) : "";
  return {
    id: field("id"),
    type: field("type"),
    kind: field("kind"),
    status: field("status"),
    action: field("action"),
    code: field("code"),
    result: field("result"),
    attempts: typeof data.attempts === "number" ? data.attempts : null,
    createdAt: field("createdAt"),
  };
}
export async function getInstagramData(): Promise<InstagramData> {
  await requireAdmin();
  const empty: InstagramData = {
    configured: false,
    username: "",
    campaigns: [],
    history: [],
    error: "",
  };
  const session = await sessionHeader();
  try {
    const status = record(
      await apiJson("integrations/instagram/status", { session }),
    );
    if (status.configured !== true) return empty;
    const result: InstagramData = {
      ...empty,
      configured: true,
      username: text(status.username),
    };
    const reads = await Promise.allSettled([
      apiJson("integrations/instagram/campaigns", { session }),
      apiJson("integrations/instagram/history", { session }),
    ]);
    if (reads[0].status === "fulfilled") {
      if (!Array.isArray(reads[0].value)) return invalid();
      result.campaigns = reads[0].value.map(campaignDTO);
    } else throw reads[0].reason;
    if (reads[1].status === "fulfilled" && Array.isArray(reads[1].value))
      result.history = reads[1].value.slice(0, 100).map(historyDTO);
    else
      result.error =
        "Não foi possível carregar o histórico. Atualize para tentar novamente.";
    return result;
  } catch (error) {
    if (error instanceof AdminError && [401, 403].includes(error.status))
      throw error;
    if (error instanceof AdminError && error.status === 404) return empty;
    return {
      ...empty,
      error:
        error instanceof AdminError
          ? error.message
          : "Não foi possível carregar a integração.",
    };
  }
}
async function request<T>(operation: () => Promise<T>): Promise<T> {
  try {
    return await operation();
  } catch (error) {
    if (error instanceof AdminError && [400, 422].includes(error.status))
      throw new AdminError(
        error.status,
        "Confira o link do post, códigos dos outfits, expressões e variáveis. As respostas completas devem ter até 1000 bytes em UTF-8.",
      );
    if (error instanceof AdminError && error.status === 409)
      throw new AdminError(
        409,
        "Já existe uma campanha para este post ou para as mensagens da conta. Edite a campanha existente.",
      );
    throw error;
  }
}
export async function saveInstagramCampaign(id: unknown, input: unknown) {
  await requireAdmin();
  const configuration = configurationDTO(input);
  return request(async () =>
    campaignDTO(
      await apiJson(`integrations/instagram/campaigns/${campaignId(id)}`, {
        method: "PUT",
        body: configuration,
        session: await sessionHeader(),
      }),
    ),
  );
}
export async function deleteInstagramCampaign(id: unknown) {
  await requireAdmin();
  await apiResponse(`integrations/instagram/campaigns/${campaignId(id)}`, {
    method: "DELETE",
    session: await sessionHeader(),
  });
}
export async function previewInstagramCampaign(
  input: unknown,
  sample: unknown,
): Promise<InstagramPreview> {
  await requireAdmin();
  const configuration = configurationDTO(input);
  return request(async () => {
    const response = record(
      await apiJson("integrations/instagram/preview", {
        method: "POST",
        body: { configuration, text: text(sample, 4000) },
        session: await sessionHeader(),
      }),
    );
    return {
      matched: response.matched !== false,
      ...(typeof response.privateReply === "string"
        ? { privateReply: response.privateReply }
        : {}),
      ...(typeof response.publicReply === "string"
        ? { publicReply: response.publicReply }
        : {}),
    };
  });
}
