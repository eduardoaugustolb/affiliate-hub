import type { ProductRepository } from '../../../src/application/ports/ProductRepository'
import { Product } from '../../../src/domain/Product'
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

  snapshots(): ReadonlyArray<ReturnType<Product['toSnapshot']>> {
    return [...this.products.values()].map((product) => product.toSnapshot())
  }

  restore(snapshots: ReadonlyArray<ReturnType<Product['toSnapshot']>>): void {
    this.products.clear()
    for (const snapshot of snapshots) {
      this.products.set(snapshot.id, Product.rehydrate(snapshot))
    }
  }
}
