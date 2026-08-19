import type { ProductRepository } from '../../../src/application/ports/ProductRepository'
import type { Product } from '../../../src/domain/Product'
import type { ProductStatus } from '../../../src/domain/ProductStatus'

export class ProductRepositoryFake implements ProductRepository {
  private readonly products = new Map<string, Product>()

  async save(product: Product): Promise<void> {
    this.products.set(product.getId(), product)
  }

  async findById(id: string): Promise<Product | null> {
    return this.products.get(id) ?? null
  }

  async listByStatus(status: ProductStatus): Promise<Product[]> {
    return [...this.products.values()].filter((product) => product.getStatus() === status)
  }
}
