import type { IdGenerator, UseCase } from '@affiliate-hub/shared-kernel'
import { type Category, Product } from '../../domain/Product'
import type { ProductRepository } from '../ports/ProductRepository'

export interface RegisterProductInput {
  name: string
  category: Category
}

export interface RegisterProductOutput {
  productId: string
}

export class RegisterProduct implements UseCase<RegisterProductInput, RegisterProductOutput> {
  constructor(
    private readonly productRepository: ProductRepository,
    private readonly idGenerator: IdGenerator,
  ) {}

  async execute(input: RegisterProductInput): Promise<RegisterProductOutput> {
    const product = Product.createDraft(this.idGenerator.generate(), input)
    await this.productRepository.save(product)
    return { productId: product.getId() }
  }
}
