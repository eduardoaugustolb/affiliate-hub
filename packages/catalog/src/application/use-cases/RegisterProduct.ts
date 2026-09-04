import type { Clock, IdGenerator, UseCase } from '@affiliate-hub/shared-kernel'
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
    private readonly clock: Clock,
  ) {}

  async execute(input: RegisterProductInput): Promise<RegisterProductOutput> {
    const product = Product.createDraft(this.idGenerator.generate(), input, this.clock.now())
    await this.productRepository.save(product)
    return { productId: product.getId() }
  }
}
