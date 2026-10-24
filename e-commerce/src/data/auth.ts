import "server-only";
import { cookies } from "next/headers";
import { cache } from "react";
import { AdminError, type AdminUser } from "@/lib/admin";
import { sessionCookieName } from "./config";
import { apiJson, apiResponse, sessionHeader } from "./transport";
import { record, text } from "./validation";

function adminDTO(raw: unknown): AdminUser {
  const user = record(raw);
  if (user.role !== "admin")
    throw new AdminError(403, "Acesso permitido apenas para administradores.");
  return { name: text(user.name) };
}
// React cache deduplicates only within a server request, never across sessions.
const currentAdmin = cache(
  async (session: string): Promise<AdminUser> =>
    adminDTO(await apiJson("auth/me", { session })),
);
export async function requireAdmin(): Promise<AdminUser> {
  const session = await sessionHeader();
  if (!session)
    throw new AdminError(401, "Sua sessão expirou. Entre novamente.");
  return currentAdmin(session);
}
export async function login(input: unknown) {
  const data = record(input);
  const email = text(data.email, 254);
  if (
    !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) ||
    typeof data.password !== "string" ||
    !data.password.trim() ||
    data.password.length > 1024
  )
    throw new AdminError(400, "Informe e-mail e senha válidos.");
  let response: Response;
  try {
    response = await apiResponse("auth/login", {
      method: "POST",
      body: { email, password: data.password },
    });
  } catch (error) {
    if (error instanceof AdminError && error.status === 401)
      throw new AdminError(401, "E-mail ou senha inválidos.");
    throw error;
  }
  const name = sessionCookieName();
  const header = response.headers
    .getSetCookie()
    .find((value) => value.startsWith(`${name}=`));
  if (!header)
    throw new AdminError(502, "A API não retornou uma sessão válida.");
  const [pair, ...attributes] = header.split(";").map((value) => value.trim());
  const token = pair.slice(name.length + 1);
  if (!token || !/^[-_A-Za-z0-9]+$/.test(token))
    throw new AdminError(502, "Sessão inválida.");
  const session = `${name}=${token}`;
  try {
    adminDTO(await apiJson("auth/me", { session }));
  } catch (error) {
    await apiResponse("auth/logout", { method: "POST", session }).catch(
      () => {},
    );
    throw error;
  }
  const attrs = new Map(
    attributes.map((value) => {
      const i = value.indexOf("=");
      return i < 0
        ? [value.toLowerCase(), ""]
        : [value.slice(0, i).toLowerCase(), value.slice(i + 1)];
    }),
  );
  const maxAge = Number(attrs.get("max-age"));
  const expires = attrs.get("expires");
  await cookies().then((store) =>
    store.set(name, token, {
      httpOnly: true,
      path: "/",
      sameSite: "strict",
      secure: name.startsWith("__Host-") || attrs.has("secure"),
      ...(Number.isFinite(maxAge) && attrs.has("max-age") ? { maxAge } : {}),
      ...(expires && Number.isFinite(Date.parse(expires))
        ? { expires: new Date(expires) }
        : {}),
    }),
  );
}
export async function logout() {
  await requireAdmin();
  await apiResponse("auth/logout", {
    method: "POST",
    session: await sessionHeader(),
  });
  const name = sessionCookieName();
  (await cookies()).set(name, "", {
    httpOnly: true,
    path: "/",
    sameSite: "strict",
    secure: name.startsWith("__Host-"),
    maxAge: 0,
  });
}
