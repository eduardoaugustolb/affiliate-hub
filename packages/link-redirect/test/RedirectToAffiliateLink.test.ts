import { describe, expect, it } from 'bun:test'
import { Product } from '@affiliate-hub/catalog'
import { NotFoundError } from '@affiliate-hub/shared-kernel'
import { RedirectToAffiliateLink } from '../src/application/use-cases/RedirectToAffiliateLink'
import { ClickLogFake } from './doubles/ClickLogFake'
import { ProductRepositoryFake } from './doubles/ProductRepositoryFake'

describe('RedirectToAffiliateLink', () => {
  it('resolves the current affiliate link and registers a click', async () => {
    const productRepository = new ProductRepositoryFake()
    const clickLog = new ClickLogFake()
    const product = Product.createDraft('PRODUCT-1', { name: 'Perfume X', category: 'perfume' })
    product.assignAffiliateLink('https://example.com/link')
    await productRepository.save(product)

    const useCase = new RedirectToAffiliateLink(productRepository, clickLog)
    const output = await useCase.execute({ id: product.getId() })

    expect(output.url).toBe('https://example.com/link')
    expect(clickLog.registered).toHaveLength(1)
    expect(clickLog.registered[0]?.productId).toBe(product.getId())
  })

  it('throws NotFoundError when the product does not exist', async () => {
    const useCase = new RedirectToAffiliateLink(new ProductRepositoryFake(), new ClickLogFake())

    await expect(useCase.execute({ id: 'MISSING-ID' })).rejects.toThrow(NotFoundError)
  })

  it('throws NotFoundError when the product has no affiliate link yet', async () => {
    const productRepository = new ProductRepositoryFake()
    const clickLog = new ClickLogFake()
    const product = Product.createDraft('PRODUCT-2', { name: 'Perfume X', category: 'perfume' })
    await productRepository.save(product)

    const useCase = new RedirectToAffiliateLink(productRepository, clickLog)

    await expect(useCase.execute({ id: product.getId() })).rejects.toThrow(NotFoundError)
    expect(clickLog.registered).toHaveLength(0)
  })
})
