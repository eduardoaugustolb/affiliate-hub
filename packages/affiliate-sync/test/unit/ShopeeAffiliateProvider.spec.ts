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
            'SHA256 Credential=credential, Signature=7b717e41b79985c1934dbbdcc666350d0550892a074d2c6b1503550f0fe3b64a, Timestamp=1786622400',
        },
        body: '{"query":"mutation GenerateShortLink($originUrl: String!, $subIds: [String!]) {\\n  generateShortLink(input: { originUrl: $originUrl, subIds: $subIds }) {\\n    shortLink\\n  }\\n}","variables":{"originUrl":"https://shopee.example/product/shop%2Fitem","subIds":["affiliate-hub"]}}',
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

  it('reports GraphQL errors when Shopee does not generate a link', async () => {
    const httpClient: HttpClient = {
      get: async <Body>() => ({ status: 200, body: {} as Body }),
      post: async <Body>() => ({
        status: 200,
        body: { errors: [{ message: 'invalid product' }] } as Body,
      }),
    }
    const provider = new ShopeeAffiliateProvider(httpClient, {
      apiUrl: 'https://example.com/graphql',
      credential: 'credential',
      secret: 'secret',
      productUrlTemplate: 'https://example.com/{externalProductId}',
    })

    await expect(provider.findLink('missing-product')).rejects.toThrow(
      'Shopee Affiliate API did not generate a short link: invalid product',
    )
  })
})
