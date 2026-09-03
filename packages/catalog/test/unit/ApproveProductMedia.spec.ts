import { describe, expect, it } from 'bun:test'
import { NotFoundError } from '@affiliate-hub/shared-kernel'
import { ApproveProductMedia } from '../../src/application/use-cases/ApproveProductMedia'
import { Product } from '../../src/domain/Product'
import { CatalogUnitOfWorkFake } from './doubles/CatalogUnitOfWorkFake'
import { EventPublisherFake } from './doubles/EventPublisherFake'
import { ProductRepositoryFake } from './doubles/ProductRepositoryFake'

describe('ApproveProductMedia', () => {
  it('approves photo and activates product when tryActivate=true and the invariant is satisfied', async () => {
    const productRepository = new ProductRepositoryFake()
    const eventPublisher = new EventPublisherFake()
    const product = Product.createDraft('PRODUCT-1', { name: 'Perfume X', category: 'perfume' })
    product.addPhoto('https://example.com/photo.jpg')
    product.assignAffiliateLink('https://example.com/link')
    await productRepository.save(product)

    const useCase = new ApproveProductMedia(
      new CatalogUnitOfWorkFake(productRepository, eventPublisher),
    )
    const output = await useCase.execute({
      productId: product.getId(),
      photoUrl: 'https://example.com/photo.jpg',
      tryActivate: true,
    })

    expect(output.status).toBe('active')
    expect(eventPublisher.published).toHaveLength(1)
    expect(eventPublisher.published[0]?.name).toBe('ProductActivated')
  })

  it('throws NotFoundError when product does not exist', async () => {
    const useCase = new ApproveProductMedia(
      new CatalogUnitOfWorkFake(new ProductRepositoryFake(), new EventPublisherFake()),
    )

    await expect(
      useCase.execute({ productId: 'missing', photoUrl: 'https://example.com/photo.jpg' }),
    ).rejects.toThrow(NotFoundError)
  })

  it('does not publish a duplicate activation event on retry', async () => {
    const productRepository = new ProductRepositoryFake()
    const eventPublisher = new EventPublisherFake()
    const product = Product.createDraft('PRODUCT-RETRY', {
      name: 'Perfume Retry',
      category: 'perfume',
    })
    product.addPhoto('https://example.com/retry.jpg')
    product.assignAffiliateLink('https://example.com/link')
    await productRepository.save(product)
    const useCase = new ApproveProductMedia(
      new CatalogUnitOfWorkFake(productRepository, eventPublisher),
    )
    const input = {
      productId: product.getId(),
      photoUrl: 'https://example.com/retry.jpg',
      tryActivate: true,
    }

    await useCase.execute(input)
    await useCase.execute(input)

    expect(eventPublisher.published).toHaveLength(1)
  })

  it('does not publish an event when not trying to activate', async () => {
    const productRepository = new ProductRepositoryFake()
    const eventPublisher = new EventPublisherFake()
    const product = Product.createDraft('PRODUCT-2', { name: 'Perfume X', category: 'perfume' })
    product.addPhoto('https://example.com/photo.jpg')
    await productRepository.save(product)

    const useCase = new ApproveProductMedia(
      new CatalogUnitOfWorkFake(productRepository, eventPublisher),
    )
    await useCase.execute({
      productId: product.getId(),
      photoUrl: 'https://example.com/photo.jpg',
    })

    expect(eventPublisher.published).toHaveLength(0)
  })
})
