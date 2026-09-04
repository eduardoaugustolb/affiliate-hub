import { describe, expect, it } from 'bun:test'

const now = new Date('2026-08-20T12:00:00.000Z')

import { Product, type ProductRepository } from '@affiliate-hub/catalog'
import { CatalogPublishedProductReader } from '../src/adapters/catalog/CatalogPublishedProductReader'

class ProductRepositoryFake implements ProductRepository {
  private readonly products = new Map<string, Product>()

  async save(product: Product): Promise<void> {
    this.products.set(product.getId(), product)
  }

  async findById(id: string): Promise<Product | null> {
    return this.products.get(id) ?? null
  }

  async listByStatus(): Promise<Product[]> {
    return [...this.products.values()]
  }
}

describe('CatalogPublishedProductReader', () => {
  it('returns the current affiliate link for an active product', async () => {
    const product = Product.createDraft(
      'PRODUCT-1',
      { name: 'Perfume X', category: 'perfume' },
      now,
    )
    product.addPhoto('https://example.com/photo.jpg', now)
    product.approvePhoto('https://example.com/photo.jpg', now)
    product.assignAffiliateLink('https://example.com/link', now)
    product.activate(now)
    const repository = new ProductRepositoryFake()
    await repository.save(product)

    const reader = new CatalogPublishedProductReader(repository)

    await expect(reader.findAffiliateLinkByCode('PRODUCT-1')).resolves.toBe(
      'https://example.com/link',
    )
  })

  it('does not expose the current link for a deactivated product', async () => {
    const product = Product.createDraft(
      'PRODUCT-2',
      { name: 'Perfume X', category: 'perfume' },
      now,
    )
    product.addPhoto('https://example.com/photo.jpg', now)
    product.approvePhoto('https://example.com/photo.jpg', now)
    product.assignAffiliateLink('https://example.com/link', now)
    product.activate(now)
    product.deactivate(now, now)
    const repository = new ProductRepositoryFake()
    await repository.save(product)

    const reader = new CatalogPublishedProductReader(repository)

    await expect(reader.findAffiliateLinkByCode('PRODUCT-2')).resolves.toBeNull()
  })
})
