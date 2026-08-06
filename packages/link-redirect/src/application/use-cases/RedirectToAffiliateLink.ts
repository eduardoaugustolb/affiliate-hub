import type { ProductRepository } from '@affiliate-hub/catalog'
import { NotFoundError, type UseCase } from '@affiliate-hub/shared-kernel'
import type { ClickLog } from '../ports/ClickLog'

export interface RedirectToAffiliateLinkInput {
  id: string
}

export interface RedirectToAffiliateLinkOutput {
  url: string
}

export class RedirectToAffiliateLink
  implements UseCase<RedirectToAffiliateLinkInput, RedirectToAffiliateLinkOutput>
{
  constructor(
    private readonly productRepository: ProductRepository,
    private readonly clickLog: ClickLog,
  ) {}

  async execute(input: RedirectToAffiliateLinkInput): Promise<RedirectToAffiliateLinkOutput> {
    const product = await this.productRepository.findById(input.id)
    if (!product) {
      throw new NotFoundError(`Product ${input.id} not found`)
    }

    const affiliateLinkUrl = product.toSnapshot().affiliateLinkUrl
    if (!affiliateLinkUrl) {
      throw new NotFoundError(`Product ${input.id} has no affiliate link yet`)
    }

    await this.clickLog.register({ productId: input.id, clickedAt: new Date() })

    return { url: affiliateLinkUrl }
  }
}
