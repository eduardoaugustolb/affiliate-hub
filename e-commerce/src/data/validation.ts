import "server-only";
import { AdminError } from "@/lib/admin";

export function invalid(): never {
  throw new AdminError(400, "Confira os filtros ou campos informados.");
}
export function record(value: unknown): Record<string, unknown> {
  if (!value || typeof value !== "object" || Array.isArray(value))
    return invalid();
  return value as Record<string, unknown>;
}
export function text(value: unknown, max = 160) {
  if (typeof value !== "string" || !value.trim() || value.trim().length > max)
    return invalid();
  return value.trim();
}
export function identifier(value: unknown) {
  const id = text(value, 100);
  if (!/^[a-zA-Z0-9-]+$/.test(id)) return invalid();
  return id;
}
export function productCode(value: unknown) {
  const code = text(value, 6).toUpperCase();
  if (!/^[A-Z0-9]{4,6}$/.test(code)) return invalid();
  return code;
}
export function outfitCode(value: unknown) {
  const code = text(value, 20).toUpperCase();
  if (!/^[A-Z0-9-]{1,20}$/.test(code)) return invalid();
  return code;
}
export function values(
  value: unknown,
  parse: (item: unknown) => string,
  allowEmpty = true,
) {
  if (
    !Array.isArray(value) ||
    value.length > 100 ||
    (!allowEmpty && !value.length)
  )
    return invalid();
  return [...new Set(value.map(parse))];
}
export function httpsUrl(value: unknown) {
  const result = text(value, 4096);
  let url: URL;
  try {
    url = new URL(result);
  } catch {
    return invalid();
  }
  if (url.protocol !== "https:" || url.username || url.password)
    return invalid();
  return result;
}
export function choice<T extends string>(
  value: unknown,
  choices: readonly T[],
): T {
  if (!choices.includes(value as T)) return invalid();
  return value as T;
}
export function pagination(offset: unknown, limit: unknown, max = 100) {
  if (
    typeof offset !== "number" ||
    !Number.isSafeInteger(offset) ||
    offset < 0 ||
    typeof limit !== "number" ||
    !Number.isInteger(limit) ||
    limit < 1 ||
    limit > max
  )
    return invalid();
  return { offset, limit };
}

export function productImages(imageUrls: unknown, imageUrl: unknown): string[] {
  if (imageUrls === undefined) return [httpsUrl(imageUrl)];
  if (
    !Array.isArray(imageUrls) ||
    imageUrls.length < 1 ||
    imageUrls.length > 20
  )
    return invalid();
  return [...new Set(imageUrls.map(httpsUrl))];
}
