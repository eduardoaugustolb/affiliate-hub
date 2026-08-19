import { describe, expect, it } from 'bun:test'
import { DeactivateProduct } from '../../src/application/use-cases/DeactivateProduct'
import { Product } from '../../src/domain/Product'
import { EventPublisherFake } from './doubles/EventPublisherFake'
import { ProductRepositoryFake } from './doubles/ProductRepositoryFake'

describe('DeactivateProduct', () => {
  it('deactivates a product (soft delete) and publishes ProductDeactivated', async () => {
    const productRepository = new ProductRepositoryFake()
    const eventPublisher = new EventPublisherFake()
    const product = Product.createDraft('PRODUCT-1', { name: 'Perfume X', category: 'perfume' })
    await productRepository.save(product)

    const useCase = new DeactivateProduct(productRepository, eventPublisher)
    await useCase.execute({ productId: product.getId() })

    const updatedProduct = await productRepository.findById(product.getId())
    expect(updatedProduct?.getStatus()).toBe('inactive')
    expect(eventPublisher.published[0]?.name).toBe('ProductDeactivated')
  })
})
