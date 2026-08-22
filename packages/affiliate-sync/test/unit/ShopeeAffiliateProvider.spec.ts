import { describe, expect, it } from 'bun:test'
import type { HttpClient, HttpRequestOptions } from '@affiliate-hub/shared-kernel'
import { ShopeeAffiliateProvider } from '../../src/infrastructure/providers/shopee/ShopeeAffiliateProvider'

describe('ShopeeAffiliateProvider', () => {
  it('signs and sends the documented GraphQL short-link request through HttpClient', async () => {
    const requests: Array<{ url: string; options: unknown }> = []
    const httpClient: HttpClient = {
      get: async <Body>() => ({ status: 200, body: {} as Body }),
      post: async <Body>(url: string, options?: HttpRequestOptions) => {
        requests.push({ url, options })
        return {
          status: 200,
          body: { data: { generateShortLink: { shortLink: 'https://shopee.ee/a' } } } as Body,
        }
      },
    }
    const provider = new ShopeeAffiliateProvider(httpClient, {
      appId: 'credential',
      secret: 'secret',
      subIds: ['affiliate-hub'],
      now: () => new Date('2026-08-13T12:00:00.000Z'),
    })

    const link = await provider.generateShortLink('https://shopee.example/product/shop/item')

    expect(link?.toString()).toBe('https://shopee.ee/a')
    expect(requests).toHaveLength(1)
    expect(requests[0]).toMatchObject({
      url: 'https://open-api.affiliate.shopee.com.br/graphql',
      options: {
        headers: {
          Authorization:
            'SHA256 Credential=credential, Timestamp=1786622400, Signature=74f7b6ae1b78481629ac109c91862a675e8d2e904d34f39ba272b9743541d659',
        },
        body: '{"query":"mutation GenerateShortLink($originUrl: String!, $subIds: [String]) {\\n  generateShortLink(input: { originUrl: $originUrl, subIds: $subIds }) {\\n    shortLink\\n  }\\n}","variables":{"originUrl":"https://shopee.example/product/shop/item","subIds":["affiliate-hub"]}}',
      },
    })
  })

  it('fails explicitly instead of silently running an unsupported product-feed sync', async () => {
    const httpClient: HttpClient = {
      get: async <Body>() => ({ status: 200, body: {} as Body }),
      post: async <Body>() => ({ status: 200, body: {} as Body }),
    }
    const provider = new ShopeeAffiliateProvider(httpClient, {
      appId: 'credential',
      secret: 'secret',
    })

    await expect(provider.listUpdatedProducts()).rejects.toThrow(
      'Shopee product feed is not configured',
    )
  })

  it('reports GraphQL errors when Shopee does not generate a link', async () => {
    const httpClient: HttpClient = {
      get: async <Body>() => ({ status: 200, body: {} as Body }),
      post: async <Body>() => ({
        status: 200,
        body: { errors: [{ message: 'invalid product' }] } as Body,
      }),
    }
    const provider = new ShopeeAffiliateProvider(httpClient, {
      appId: 'credential',
      secret: 'secret',
    })

    await expect(
      provider.generateShortLink('https://shopee.example/missing-product'),
    ).rejects.toThrow('Shopee Affiliate API did not generate a short link: invalid product')
  })

  it('rejects malformed product URLs as a bad request before calling Shopee', async () => {
    let requestCount = 0
    const provider = new ShopeeAffiliateProvider(
      {
        get: async <Body>() => ({ status: 200, body: {} as Body }),
        post: async <Body>() => {
          requestCount += 1
          return { status: 200, body: {} as Body }
        },
      },
      { appId: 'credential', secret: 'secret' },
    )

    await expect(provider.generateShortLink('not a URL')).rejects.toThrow(
      'Shopee product URL must be a valid HTTP or HTTPS URL',
    )
    expect(requestCount).toBe(0)
  })

  it('reports provider unavailability without exposing request credentials', async () => {
    const provider = new ShopeeAffiliateProvider(
      {
        get: async <Body>() => ({ status: 200, body: {} as Body }),
        post: async () => {
          throw new Error('network failure')
        },
      },
      { appId: 'credential', secret: 'secret' },
    )

    await expect(provider.generateShortLink('https://shopee.example/product')).rejects.toThrow(
      'Shopee Affiliate API is unavailable',
    )
  })
})
