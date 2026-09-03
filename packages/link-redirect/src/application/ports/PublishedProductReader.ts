export interface PublishedProductReader {
  findAffiliateLinkByCode(code: string): Promise<string | null>
}
