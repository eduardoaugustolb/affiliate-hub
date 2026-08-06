import type { Product } from '../../domain/Product'
import type { ProductStatus } from '../../domain/ProductStatus'

export interface ProductRepository {
  save(product: Product): Promise<void>
  findById(id: string): Promise<Product | null>
  listByStatus(status: ProductStatus): Promise<Product[]>
}
