import { DomainError } from '@affiliate-hub/shared-kernel'

export class AffiliateLink {
  private constructor(
    private url: URL,
    private updatedAt: Date,
  ) {}

  static rehydrate(url: string, updatedAt: Date): AffiliateLink {
    const parsedUrl = new URL(url)
    const parsedUpdatedAt = new Date(updatedAt)
    if (Number.isNaN(parsedUpdatedAt.getTime())) {
      throw new DomainError('Invalid updatedAt')
    }
    AffiliateLink.validateUrl(parsedUrl)
    return new AffiliateLink(parsedUrl, parsedUpdatedAt)
  }

  static create(url: string): AffiliateLink {
    const parsedUrl = new URL(url)
    AffiliateLink.validateUrl(parsedUrl)
    return new AffiliateLink(parsedUrl, new Date())
  }

  update(url: string): AffiliateLink {
    const parsedUrl = new URL(url)
    AffiliateLink.validateUrl(parsedUrl)
    this.url = parsedUrl
    this.updatedAt = new Date()
    return this
  }

  getUrl(): URL {
    return new URL(this.url)
  }

  getUpdatedAt(): Date {
    return new Date(this.updatedAt)
  }

  toString(): string {
    return this.url.toString()
  }

  private static validateUrl(url: URL): void {
    if (!url.protocol) {
      throw new DomainError('URL must have a protocol')
    }

    if (url.protocol !== 'http:' && url.protocol !== 'https:') {
      throw new DomainError('URL must have a valid protocol')
    }
  }
}
