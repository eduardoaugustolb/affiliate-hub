import type { AffiliateProductImportJobQueue } from '@affiliate-hub/affiliate-sync'
import type { Queue } from 'bullmq'

export const EVENT_NAME = 'affiliate-product-import'

export class BullMqAffiliateProductImportJobQueue implements AffiliateProductImportJobQueue {
  constructor(private queue: Queue) {}

  async enqueue(eventId: string): Promise<void> {
    await this.queue.add(
      EVENT_NAME,
      { eventId },
      {
        attempts: 5,
        jobId: eventId,
        backoff: {
          type: 'exponential',
          delay: 60 * 1000, // One minute
        },
      },
    )
  }
}
