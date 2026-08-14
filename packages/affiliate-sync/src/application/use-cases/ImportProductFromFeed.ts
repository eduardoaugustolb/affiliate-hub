import type { AffiliateProductImportRequested } from '@affiliate-hub/contracts'
import type { IdGenerator, UseCase } from '@affiliate-hub/shared-kernel'
import type { IntegrationEventPublisher } from '../ports/IntegrationEventPublisher'

export interface ImportProductFromFeedInput {
  externalProductId: string
  name: string
  category: 'streetwear' | 'perfume'
}

export interface ImportProductFromFeedOutput {
  eventId: string
}

export class ImportProductFromFeed
  implements UseCase<ImportProductFromFeedInput, ImportProductFromFeedOutput>
{
  constructor(
    private readonly eventPublisher: IntegrationEventPublisher,
    private readonly idGenerator: IdGenerator,
  ) {}

  async execute(input: ImportProductFromFeedInput): Promise<ImportProductFromFeedOutput> {
    const eventId = this.idGenerator.generate()
    const event: AffiliateProductImportRequested = {
      id: eventId,
      name: 'AffiliateProductImportRequested',
      occurredAt: new Date().toISOString(),
      payload: input,
    }
    await this.eventPublisher.publish(event)
    return { eventId }
  }
}
