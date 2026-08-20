import type { HttpClient } from '@affiliate-hub/shared-kernel'
import type {
  AffiliateProduct,
  AffiliateProvider,
} from '../../../application/ports/AffiliateProvider'
import { AffiliateLink } from '../../../domain/AffiliateLink'

const generateShortLinkMutation = `mutation GenerateShortLink($originUrl: String!, $subIds: [String!]) {
  generateShortLink(input: { originUrl: $originUrl, subIds: $subIds }) {
    shortLink
  }
}`

interface GenerateShortLinkResponse {
  data?: {
    generateShortLink?: {
      shortLink?: string
    }
  }
  errors?: Array<{ message?: string }>
}

export interface ShopeeAffiliateProviderConfig {
  apiUrl: string
  credential: string
  secret: string
  productUrlTemplate: string
  subIds?: string[]
  now?: () => Date
}

/**
 * Adapter for the documented Affiliate GraphQL short-link mutation.
 *
 * Product-feed discovery is deliberately not implemented until Shopee supplies
 * the account-specific feed operation and response schema. Returning an empty
 * list here would hide a broken sync, so it fails explicitly instead.
 */
export class ShopeeAffiliateProvider implements AffiliateProvider {
  private readonly now: () => Date

  constructor(
    private readonly httpClient: HttpClient,
    private readonly config: ShopeeAffiliateProviderConfig,
  ) {
    if (!config.productUrlTemplate.includes('{externalProductId}')) {
      throw new Error('Shopee productUrlTemplate must include {externalProductId}')
    }
    if (config.subIds && config.subIds.length > 5) {
      throw new Error('Shopee supports at most five subIds')
    }
    this.now = config.now ?? (() => new Date())
  }

  async findLink(externalProductId: string): Promise<AffiliateLink | undefined> {
    const originUrl = this.config.productUrlTemplate.replace(
      '{externalProductId}',
      encodeURIComponent(externalProductId),
    )
    const payload = JSON.stringify({
      query: generateShortLinkMutation,
      variables: { originUrl, subIds: this.config.subIds ?? [] },
    })
    const timestamp = Math.floor(this.now().getTime() / 1_000).toString()
    const signature = new Bun.CryptoHasher('sha256')
      .update(`${this.config.credential}${timestamp}${payload}${this.config.secret}`)
      .digest('hex')

    const response = await this.httpClient.post<GenerateShortLinkResponse>(this.config.apiUrl, {
      headers: {
        Authorization: `SHA256 Credential=${this.config.credential}, Signature=${signature}, Timestamp=${timestamp}`,
        'Content-Type': 'application/json',
      },
      body: payload,
    })

    const shortLink = response.body.data?.generateShortLink?.shortLink
    if (response.status < 200 || response.status >= 300 || !shortLink) {
      const detail = response.body.errors
        ?.map((error) => error.message)
        .filter(Boolean)
        .join('; ')
      throw new Error(
        `Shopee Affiliate API did not generate a short link${detail ? `: ${detail}` : ''}`,
      )
    }

    return AffiliateLink.create(shortLink)
  }

  async listUpdatedProducts(): Promise<AffiliateProduct[]> {
    throw new Error(
      'Shopee product feed is not configured: obtain the approved feed GraphQL operation and response schema before enabling sync',
    )
  }
}
