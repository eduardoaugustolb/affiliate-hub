import type { ProductRepository } from '@affiliate-hub/catalog'
import type { PublishedProductReader } from '@affiliate-hub/link-redirect'

export class CatalogPublishedProductReader implements PublishedProductReader {
  constructor(private readonly productRepository: ProductRepository) {}

  async findAffiliateLinkByCode(code: string): Promise<string | null> {
    const product = await this.productRepository.findById(code)
    if (product?.getStatus() !== 'active') {
      return null
    }

    return product.toSnapshot().affiliateLinkUrl
  }
}
