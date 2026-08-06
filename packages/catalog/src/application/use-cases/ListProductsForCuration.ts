import type { UseCase } from '@affiliate-hub/shared-kernel'
import type { ProductSnapshot } from '../../domain/Product'
import type { ProductRepository } from '../ports/ProductRepository'

export type ListProductsForCurationInput = Record<string, never>

export interface ListProductsForCurationOutput {
  products: ProductSnapshot[]
}

export class ListProductsForCuration
  implements UseCase<ListProductsForCurationInput, ListProductsForCurationOutput>
{
  constructor(private readonly productRepository: ProductRepository) {}

  async execute(): Promise<ListProductsForCurationOutput> {
    const products = await this.productRepository.listByStatus('draft')
    return { products: products.map((product) => product.toSnapshot()) }
  }
}
