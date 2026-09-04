import { describe, expect, it } from 'bun:test'
import { DeactivateProduct } from '../../src/application/use-cases/DeactivateProduct'
import { Product } from '../../src/domain/Product'
import { CatalogUnitOfWorkFake } from './doubles/CatalogUnitOfWorkFake'
import { EventPublisherFake } from './doubles/EventPublisherFake'
import { ProductRepositoryFake } from './doubles/ProductRepositoryFake'

describe('DeactivateProduct', () => {
  it('deactivates a product (soft delete) and publishes ProductDeactivated', async () => {
    const productRepository = new ProductRepositoryFake()
    const eventPublisher = new EventPublisherFake()
    const product = Product.createDraft('PRODUCT-1', { name: 'Perfume X', category: 'perfume' })
    await productRepository.save(product)

    const useCase = new DeactivateProduct(
      new CatalogUnitOfWorkFake(productRepository, eventPublisher),
    )
    await useCase.execute({ productId: product.getId() })

    const updatedProduct = await productRepository.findById(product.getId())
    expect(updatedProduct?.getStatus()).toBe('inactive')
    expect(eventPublisher.published[0]?.name).toBe('ProductDeactivated')
  })

  it('does not publish a duplicate event on retry', async () => {
    const productRepository = new ProductRepositoryFake()
    const eventPublisher = new EventPublisherFake()
    const product = Product.createDraft('PRODUCT-RETRY', {
      name: 'Perfume Retry',
      category: 'perfume',
    })
    await productRepository.save(product)
    const useCase = new DeactivateProduct(
      new CatalogUnitOfWorkFake(productRepository, eventPublisher),
    )

    await useCase.execute({ productId: product.getId() })
    await useCase.execute({ productId: product.getId() })

    expect(eventPublisher.published).toHaveLength(1)
    expect((await productRepository.findById(product.getId()))?.getStatus()).toBe('inactive')
  })

  it('rolls back the product when outbox persistence fails', async () => {
    const productRepository = new ProductRepositoryFake()
    await productRepository.save(
      Product.createDraft('PRODUCT-2', { name: 'Perfume Y', category: 'perfume' }),
    )
    const failingPublisher: EventPublisherFake = new EventPublisherFake()
    failingPublisher.publish = async () => {
      throw new Error('outbox unavailable')
    }

    const useCase = new DeactivateProduct(
      new CatalogUnitOfWorkFake(productRepository, failingPublisher),
    )

    await expect(useCase.execute({ productId: 'PRODUCT-2' })).rejects.toThrow('outbox unavailable')
    expect((await productRepository.findById('PRODUCT-2'))?.getStatus()).toBe('draft')
  })
})
