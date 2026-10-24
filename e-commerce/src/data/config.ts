import "server-only";

export function apiOrigin() {
  const url = new URL(process.env.API_URL ?? "http://127.0.0.1:3000");
  if (
    !["http:", "https:"].includes(url.protocol) ||
    url.username ||
    url.password ||
    url.search ||
    url.hash ||
    url.pathname !== "/"
  )
    throw new Error("Configuração da API inválida.");
  return url.origin;
}
export function sessionCookieName() {
  return (
    process.env.SESSION_COOKIE_NAME ??
    (process.env.NODE_ENV === "production" ? "__Host-session" : "session")
  );
}
