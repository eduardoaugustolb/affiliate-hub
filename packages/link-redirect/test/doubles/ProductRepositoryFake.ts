import type { Product, ProductRepository, ProductStatus } from '@affiliate-hub/catalog'

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
