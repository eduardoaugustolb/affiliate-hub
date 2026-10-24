import "server-only";
import { cookies } from "next/headers";
import { AdminError } from "@/lib/admin";
import { apiOrigin, sessionCookieName } from "./config";

// Internal transport. Feature modules own authorization and DTO projection.
export async function sessionHeader() {
  const name = sessionCookieName();
  const value = (await cookies()).get(name)?.value;
  if (value && (value.length > 1024 || !/^[-_A-Za-z0-9]+$/.test(value)))
    throw new AdminError(401, "Sua sessão expirou. Entre novamente.");
  return value ? `${name}=${value}` : "";
}
export async function apiResponse(
  path: string,
  options: {
    method?: "GET" | "POST" | "PUT" | "DELETE";
    body?: unknown;
    session?: string;
  } = {},
) {
  const headers = new Headers({ Accept: "application/json" });
  if (options.session) headers.set("Cookie", options.session);
  if (options.body !== undefined)
    headers.set("Content-Type", "application/json");
  let response: Response;
  try {
    response = await fetch(`${apiOrigin()}/${path}`, {
      method: options.method ?? "GET",
      headers,
      body:
        options.body === undefined ? undefined : JSON.stringify(options.body),
      cache: "no-store",
      redirect: "error",
      signal: AbortSignal.timeout(15000),
    });
  } catch {
    throw new AdminError(502, "API indisponível. Tente novamente.");
  }
  if (!response.ok) {
    const failure = await response.json().catch(() => null);
    const code =
      typeof failure?.code === "string" &&
      /^[A-Z0-9_]{1,64}$/.test(failure.code)
        ? failure.code
        : "UNKNOWN";
    console.error("[API request failed]", {
      method: options.method ?? "GET",
      path: path.split("?")[0],
      status: response.status,
      code,
    });
    const messages: Record<number, string> = {
      400: "Confira os filtros ou campos informados.",
      401: "Sua sessão expirou. Entre novamente.",
      403: "Acesso permitido apenas para administradores.",
      404: "Registro não encontrado.",
      409: "Este registro já existe ou está em uso.",
      422: "A API recusou os dados do produto. Confira nome, links, marketplace, status e imagens (HTTP 422).",
      429: "Muitas tentativas. Aguarde e tente novamente.",
    };
    throw new AdminError(
      response.status,
      messages[response.status] ??
        (options.method && options.method !== "GET"
          ? `A API não conseguiu concluir a operação (HTTP ${response.status}). Tente novamente.`
          : "Não foi possível carregar os dados. Tente novamente."),
    );
  }
  return response;
}
export async function apiJson(
  path: string,
  options: Parameters<typeof apiResponse>[1] = {},
): Promise<unknown> {
  const response = await apiResponse(path, options);
  try {
    return await response.json();
  } catch {
    throw new AdminError(502, "Resposta inválida da API.");
  }
}
