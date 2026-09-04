import type { AffiliateProductImportRequested } from '@affiliate-hub/contracts'
import type { IdGenerator, UseCase } from '@affiliate-hub/shared-kernel'
import type { AffiliateProductImportJobQueue } from '../ports/AffiliateProductImportJobQueue'
import type { IntegrationEventPublisher } from '../ports/IntegrationEventPublisher'
import type { OutboxEventDeliveryRepository } from '../ports/OutboxEventDeliveryRepository'
export interface ImportProductFromFeedInput {
  externalProductId: string
  name: string
  provider: string
  category: 'streetwear' | 'perfume'
}

export interface ImportProductFromFeedOutput {
  eventId: string
  queuedImmediately: boolean
}

export class ImportProductFromFeed
  implements UseCase<ImportProductFromFeedInput, ImportProductFromFeedOutput>
{
  constructor(
    private readonly outbox: IntegrationEventPublisher,
    private readonly productImport: AffiliateProductImportJobQueue,
    private readonly idGenerator: IdGenerator,
    private readonly eventDelivery: OutboxEventDeliveryRepository,
  ) {}

  async execute(input: ImportProductFromFeedInput): Promise<ImportProductFromFeedOutput> {
    const eventId = this.idGenerator.generate()
    const event: AffiliateProductImportRequested = {
      id: eventId,
      name: 'AffiliateProductImportRequested',
      payload: input,
      occurredAt: new Date().toISOString(),
    }
    await this.outbox.publish(event)
    try {
      await this.productImport.enqueue(eventId)
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error)
      await this.eventDelivery.registerEnqueueFailure(eventId, message)
      return { eventId, queuedImmediately: false }
    }
    await this.eventDelivery.markAsEnqueued(eventId)
    return { eventId, queuedImmediately: true }
  }
}
