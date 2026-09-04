import { describe, expect, it } from 'bun:test'

const now = new Date('2026-08-20T12:00:00.000Z')

import { ListProductsForCuration } from '../../src/application/use-cases/ListProductsForCuration'
import { Product } from '../../src/domain/Product'
import { ProductRepositoryFake } from './doubles/ProductRepositoryFake'

describe('ListProductsForCuration', () => {
  it('lists only draft products', async () => {
    const productRepository = new ProductRepositoryFake()

    const draft = Product.createDraft('PRODUCT-1', { name: 'Cap', category: 'streetwear' }, now)
    const active = Product.createDraft('PRODUCT-2', { name: 'Perfume Y', category: 'perfume' }, now)
    active.addPhoto('https://example.com/photo.jpg', now)
    active.approvePhoto('https://example.com/photo.jpg', now)
    active.assignAffiliateLink('https://example.com/link', now)
    active.activate(now)

    await productRepository.save(draft)
    await productRepository.save(active)

    const useCase = new ListProductsForCuration(productRepository)
    const output = await useCase.execute()

    expect(output.products).toHaveLength(1)
    expect(output.products[0]?.name).toBe('Cap')
  })
})
