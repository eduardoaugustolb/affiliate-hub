import type { UseCase } from '@affiliate-hub/shared-kernel'
import type { AffiliateProductImportRequestedEventHandler } from '../ports/AffiliateProductImportRequestedEventHandler'
import type { OutboxEventDeliveryRepository } from '../ports/OutboxEventDeliveryRepository'

export interface DeliverAffiliateProductImportInput {
  eventId: string
}

export type DeliverAffiliateProductImportOutput =
  | { status: 'delivered' }
  | { status: 'event-not-found' }
  | { status: 'already-processed' }

export class DeliverAffiliateProductImport
  implements UseCase<DeliverAffiliateProductImportInput, DeliverAffiliateProductImportOutput>
{
  constructor(
    private readonly outboxEvents: OutboxEventDeliveryRepository,
    private readonly handler: AffiliateProductImportRequestedEventHandler,
  ) {}

  async execute(
    input: DeliverAffiliateProductImportInput,
  ): Promise<DeliverAffiliateProductImportOutput> {
    const event = await this.outboxEvents.findByEventId(input.eventId)

    if (!event) return { status: 'event-not-found' }
    if (event.processedAt) return { status: 'already-processed' }
    if (event.name !== 'AffiliateProductImportRequested')
      throw new Error(`Unexpected event name: ${event.name}`)

    await this.handler(event)
    await this.outboxEvents.markAsProcessed(event.eventId)

    return { status: 'delivered' }
  }
}
