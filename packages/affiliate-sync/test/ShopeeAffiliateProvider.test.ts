import { describe, expect, it } from 'bun:test'
import type { HttpClient, HttpRequestOptions } from '@affiliate-hub/shared-kernel'
import { ShopeeAffiliateProvider } from '../src/adapters/ShopeeAffiliateProvider'

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
      apiUrl: 'https://open-api.affiliate.shopee.example/graphql',
      credential: 'credential',
      secret: 'secret',
      productUrlTemplate: 'https://shopee.example/product/{externalProductId}',
      subIds: ['affiliate-hub'],
      now: () => new Date('2026-08-13T12:00:00.000Z'),
    })

    const link = await provider.findLink('shop/item')

    expect(link?.toString()).toBe('https://shopee.ee/a')
    expect(requests).toHaveLength(1)
    expect(requests[0]).toMatchObject({
      url: 'https://open-api.affiliate.shopee.example/graphql',
      options: {
        headers: {
          Authorization:
            'SHA256 Credential=credential, Signature=5c1d94e459f447c6aa1148678920d89edf8480f3d4498c25991ee7d7016c7e6f, Timestamp=1786622400',
        },
        body: {
          variables: {
            originUrl: 'https://shopee.example/product/shop%2Fitem',
            subIds: ['affiliate-hub'],
          },
        },
      },
    })
  })

  it('fails explicitly instead of silently running an unsupported product-feed sync', async () => {
    const httpClient: HttpClient = {
      get: async <Body>() => ({ status: 200, body: {} as Body }),
      post: async <Body>() => ({ status: 200, body: {} as Body }),
    }
    const provider = new ShopeeAffiliateProvider(httpClient, {
      apiUrl: 'https://example.com/graphql',
      credential: 'credential',
      secret: 'secret',
      productUrlTemplate: 'https://example.com/{externalProductId}',
    })

    await expect(provider.listUpdatedProducts()).rejects.toThrow(
      'Shopee product feed is not configured',
    )
  })
})
