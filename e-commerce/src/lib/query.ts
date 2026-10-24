export type QueryParams = Record<string, string | string[] | undefined>;
export function queryValue(params: QueryParams, key: string) {
  const value = params[key];
  return Array.isArray(value) ? (value[0] ?? "") : (value ?? "");
}
export function pageOffset(value: string, size: number) {
  const parsed = Number(value);
  return Number.isSafeInteger(parsed) && parsed >= 0
    ? Math.floor(parsed / size) * size
    : 0;
}
