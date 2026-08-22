import { describe, expect, it } from 'bun:test'
import { RegisterManualProduct } from '../../src/application/use-cases/RegisterManualProduct'
import { IdGeneratorFake } from './doubles/IdGeneratorFake'
import { ProductRepositoryFake } from './doubles/ProductRepositoryFake'

describe('RegisterManualProduct', () => {
  it('creates a draft product with the affiliate link entered by the administrator', async () => {
    const productRepository = new ProductRepositoryFake()
    const useCase = new RegisterManualProduct(productRepository, new IdGeneratorFake())

    const output = await useCase.execute({
      name: 'Oversized Hoodie',
      category: 'streetwear',
      affiliateLinkUrl: 'https://s.shopee.com.br/affiliate-link',
    })

    const savedProduct = await productRepository.findById(output.productId)
    expect(savedProduct?.toSnapshot()).toMatchObject({
      status: 'draft',
      affiliateLinkUrl: 'https://s.shopee.com.br/affiliate-link',
    })
  })

  it('rejects an affiliate link that is not an HTTP URL', async () => {
    const productRepository = new ProductRepositoryFake()
    const useCase = new RegisterManualProduct(productRepository, new IdGeneratorFake())

    await expect(
      useCase.execute({
        name: 'Oversized Hoodie',
        category: 'streetwear',
        affiliateLinkUrl: 'javascript:alert(1)',
      }),
    ).rejects.toThrow('Affiliate link must use HTTP or HTTPS')

    expect(await productRepository.findById('PRODUCT-1')).toBeNull()
  })
})
