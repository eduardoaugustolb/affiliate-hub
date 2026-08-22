import {
  BadRequestError,
  ExternalServiceError,
  type HttpClient,
} from '@affiliate-hub/shared-kernel'
import type {
  AffiliateProduct,
  AffiliateProvider,
} from '../../../application/ports/AffiliateProvider'
import { AffiliateLink } from '../../../domain/AffiliateLink'

const generateShortLinkMutation = `mutation GenerateShortLink($originUrl: String!, $subIds: [String]) {
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
  appId: string
  secret: string
  subIds?: string[]
  now?: () => Date
}

const SHOPEE_AFFILIATE_API_URL = 'https://open-api.affiliate.shopee.com.br/graphql'

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
    if (config.subIds && config.subIds.length > 5) {
      throw new Error('Shopee supports at most five subIds')
    }
    this.now = config.now ?? (() => new Date())
  }

  async generateShortLink(originUrl: string): Promise<AffiliateLink> {
    ShopeeAffiliateProvider.validateOriginUrl(originUrl)
    const payload = JSON.stringify({
      query: generateShortLinkMutation,
      variables: { originUrl, subIds: this.config.subIds ?? [] },
    })
    const timestamp = Math.floor(this.now().getTime() / 1_000).toString()
    const signature = new Bun.CryptoHasher('sha256')
      .update(`${this.config.appId}${timestamp}${payload}${this.config.secret}`)
      .digest('hex')

    let response: Awaited<ReturnType<typeof this.httpClient.post<GenerateShortLinkResponse>>>
    try {
      response = await this.httpClient.post<GenerateShortLinkResponse>(SHOPEE_AFFILIATE_API_URL, {
        headers: {
          Authorization: `SHA256 Credential=${this.config.appId}, Timestamp=${timestamp}, Signature=${signature}`,
          'Content-Type': 'application/json',
        },
        body: payload,
      })
    } catch (error) {
      throw new ExternalServiceError('Shopee Affiliate API is unavailable', { cause: error })
    }

    const shortLink = response.body.data?.generateShortLink?.shortLink
    if (response.status < 200 || response.status >= 300 || !shortLink) {
      const detail = response.body.errors
        ?.map((error) => error.message)
        .filter(Boolean)
        .join('; ')
      throw new ExternalServiceError(
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

  private static validateOriginUrl(value: string): void {
    let url: URL
    try {
      url = new URL(value)
    } catch {
      throw new BadRequestError('Shopee product URL must be a valid HTTP or HTTPS URL')
    }
    if (url.protocol !== 'http:' && url.protocol !== 'https:') {
      throw new BadRequestError('Shopee product URL must use HTTP or HTTPS')
    }
  }
}
