import type { IdGenerator, UseCase } from '@affiliate-hub/shared-kernel'
import { type Category, Product } from '../../domain/Product'
import type { ProductRepository } from '../ports/ProductRepository'

export interface RegisterManualProductInput {
  name: string
  category: Category
  affiliateLinkUrl: string
}

export interface RegisterManualProductOutput {
  productId: string
}

/**
 * Registers a product entered by an administrator. Imports from external
 * providers use RegisterProduct instead because they may not have an affiliate
 * link when the event is first received.
 */
export class RegisterManualProduct
  implements UseCase<RegisterManualProductInput, RegisterManualProductOutput>
{
  constructor(
    private readonly productRepository: ProductRepository,
    private readonly idGenerator: IdGenerator,
  ) {}

  async execute(input: RegisterManualProductInput): Promise<RegisterManualProductOutput> {
    const product = Product.createDraft(this.idGenerator.generate(), input)
    product.assignAffiliateLink(input.affiliateLinkUrl)
    await this.productRepository.save(product)
    return { productId: product.getId() }
  }
}
