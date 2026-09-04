import { describe, expect, it } from 'bun:test'
import { RegisterManualProduct } from '../../src/application/use-cases/RegisterManualProduct'
import { IdGeneratorFake } from './doubles/IdGeneratorFake'
import { ProductRepositoryFake } from './doubles/ProductRepositoryFake'

const clock = { now: () => new Date('2026-08-20T12:00:00.000Z') }

class AffiliateLinkGeneratorFake {
  constructor(private readonly affiliateLinkUrl: string) {}

  async generateAffiliateLink(): Promise<string> {
    return this.affiliateLinkUrl
  }
}

describe('RegisterManualProduct', () => {
  it('creates a draft product with the affiliate link generated from the product URL', async () => {
    const productRepository = new ProductRepositoryFake()
    const useCase = new RegisterManualProduct(
      productRepository,
      new IdGeneratorFake(),
      new AffiliateLinkGeneratorFake('https://s.shopee.com.br/affiliate-link'),
      clock,
    )

    const output = await useCase.execute({
      name: 'Oversized Hoodie',
      category: 'streetwear',
      productUrl: 'https://shopee.com.br/product/123',
    })

    const savedProduct = await productRepository.findById(output.productId)
    expect(savedProduct?.toSnapshot()).toMatchObject({
      status: 'draft',
      affiliateLinkUrl: 'https://s.shopee.com.br/affiliate-link',
    })
  })

  it('rejects an invalid link returned by the affiliate provider', async () => {
    const productRepository = new ProductRepositoryFake()
    const useCase = new RegisterManualProduct(
      productRepository,
      new IdGeneratorFake(),
      new AffiliateLinkGeneratorFake('javascript:alert(1)'),
      clock,
    )

    await expect(
      useCase.execute({
        name: 'Oversized Hoodie',
        category: 'streetwear',
        productUrl: 'https://shopee.com.br/product/123',
      }),
    ).rejects.toThrow('Affiliate link must use HTTP or HTTPS')

    expect(await productRepository.findById('PRODUCT-1')).toBeNull()
  })

  it('rejects an invalid original product URL before invoking the affiliate provider', async () => {
    const productRepository = new ProductRepositoryFake()
    let providerCalled = false
    const useCase = new RegisterManualProduct(
      productRepository,
      new IdGeneratorFake(),
      {
        async generateAffiliateLink(): Promise<string> {
          providerCalled = true
          return 'https://s.shopee.com.br/affiliate-link'
        },
      },
      clock,
    )

    await expect(
      useCase.execute({
        name: 'Oversized Hoodie',
        category: 'streetwear',
        productUrl: 'not a URL',
      }),
    ).rejects.toThrow('Shopee product URL must be a valid HTTP or HTTPS URL')

    expect(providerCalled).toBe(false)
  })
})
