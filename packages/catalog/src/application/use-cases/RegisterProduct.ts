import type { UseCase } from '@affiliate-hub/shared-kernel'
import { Product, type Category } from '../../domain/Product'
import type { ProductRepository } from '../ports/ProductRepository'

export interface RegisterProductInput {
  name: string
  category: Category
}

export interface RegisterProductOutput {
  productId: string
}

export class RegisterProduct implements UseCase<RegisterProductInput, RegisterProductOutput> {
  constructor(private readonly productRepository: ProductRepository) {}

  async execute(input: RegisterProductInput): Promise<RegisterProductOutput> {
    const product = Product.createDraft(input)
    await this.productRepository.save(product)
    return { productId: product.getId().toString() }
  }
}
