import { type Clock, NotFoundError, type UseCase } from '@affiliate-hub/shared-kernel'
import type { ClickLog } from '../ports/ClickLog'
import type { PublishedProductReader } from '../ports/PublishedProductReader'

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
    private readonly publishedProductReader: PublishedProductReader,
    private readonly clock: Clock,
    private readonly clickLog: ClickLog,
  ) {}

  async execute(input: RedirectToAffiliateLinkInput): Promise<RedirectToAffiliateLinkOutput> {
    const affiliateLinkUrl = await this.publishedProductReader.findAffiliateLinkByCode(input.id)
    if (!affiliateLinkUrl) {
      throw new NotFoundError(`Published product ${input.id} not found or has no affiliate link`)
    }

    await this.clickLog.register({ productId: input.id, clickedAt: this.clock.now() })

    return { url: affiliateLinkUrl }
  }
}
