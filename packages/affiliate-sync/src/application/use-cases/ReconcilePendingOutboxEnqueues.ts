import type { UseCase } from '@affiliate-hub/shared-kernel'
import type { AffiliateProductImportJobQueue } from '../ports/AffiliateProductImportJobQueue'
import type { OutboxEventDeliveryRepository } from '../ports/OutboxEventDeliveryRepository'

const BATCH_SIZE = 100

export interface ReconcilePendingOutboxEnqueuesOutput {
  enqueued: number
  failed: number
}

export class ReconcilePendingOutboxEnqueues
  implements UseCase<void, ReconcilePendingOutboxEnqueuesOutput>
{
  constructor(
    private readonly outboxEvents: OutboxEventDeliveryRepository,
    private readonly jobQueue: AffiliateProductImportJobQueue,
  ) {}

  async execute(): Promise<ReconcilePendingOutboxEnqueuesOutput> {
    const events = await this.outboxEvents.findPendingEnqueues(BATCH_SIZE)
    let enqueued = 0
    let failed = 0

    for (const event of events) {
      try {
        await this.jobQueue.enqueue(event.eventId)
      } catch (error) {
        const message = error instanceof Error ? error.message : String(error)
        await this.outboxEvents.registerEnqueueFailure(event.eventId, message)
        failed += 1
        continue
      }

      await this.outboxEvents.markAsEnqueued(event.eventId)
      enqueued += 1
    }

    return { enqueued, failed }
  }
}
