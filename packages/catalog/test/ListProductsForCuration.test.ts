import { describe, expect, it } from 'bun:test'
import { ListProductsForCuration } from '../src/application/use-cases/ListProductsForCuration'
import { Product } from '../src/domain/Product'
import { ProductRepositoryFake } from './doubles/ProductRepositoryFake'

describe('ListProductsForCuration', () => {
  it('lists only draft products', async () => {
    const productRepository = new ProductRepositoryFake()

    const draft = Product.createDraft('PRODUCT-1', { name: 'Cap', category: 'streetwear' })
    const active = Product.createDraft('PRODUCT-2', { name: 'Perfume Y', category: 'perfume' })
    active.addPhoto('https://example.com/photo.jpg')
    active.approvePhoto('https://example.com/photo.jpg')
    active.assignAffiliateLink('https://example.com/link')
    active.activate()

    await productRepository.save(draft)
    await productRepository.save(active)

    const useCase = new ListProductsForCuration(productRepository)
    const output = await useCase.execute()

    expect(output.products).toHaveLength(1)
    expect(output.products[0]?.name).toBe('Cap')
  })
})
