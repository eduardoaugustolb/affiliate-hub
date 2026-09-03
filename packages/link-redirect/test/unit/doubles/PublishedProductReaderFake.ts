import type { PublishedProductReader } from '../../../src/application/ports/PublishedProductReader'

export class PublishedProductReaderFake implements PublishedProductReader {
  readonly links = new Map<string, string>()

  async findAffiliateLinkByCode(code: string): Promise<string | null> {
    return this.links.get(code) ?? null
  }
}
