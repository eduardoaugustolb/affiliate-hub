import { BadRequestError, type IdGenerator, type UseCase } from '@affiliate-hub/shared-kernel'
import { type Category, Product } from '../../domain/Product'
import type { AffiliateLinkGenerator } from '../ports/AffiliateLinkGenerator'
import type { ProductRepository } from '../ports/ProductRepository'

export interface RegisterManualProductInput {
  name: string
  category: Category
  productUrl: string
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
    private readonly affiliateLinkGenerator: AffiliateLinkGenerator,
  ) {}

  async execute(input: RegisterManualProductInput): Promise<RegisterManualProductOutput> {
    RegisterManualProduct.validateProductUrl(input.productUrl)
    const affiliateLinkUrl = await this.affiliateLinkGenerator.generateAffiliateLink(
      input.productUrl,
    )
    const product = Product.createDraft(this.idGenerator.generate(), input)
    product.assignAffiliateLink(affiliateLinkUrl)
    await this.productRepository.save(product)
    return { productId: product.getId() }
  }

  private static validateProductUrl(value: string): void {
    let url: URL
    try {
      url = new URL(value)
    } catch {
      throw new BadRequestError('Shopee product URL must be a valid HTTP or HTTPS URL')
    }
    if (url.protocol !== 'http:' && url.protocol !== 'https:') {
      throw new BadRequestError('Shopee product URL must use HTTP or HTTPS')
    }
  }
}
