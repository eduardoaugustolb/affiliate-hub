import { describe, expect, it } from 'bun:test'
import type { AffiliateProductImportJobQueue } from '../../src/application/ports/AffiliateProductImportJobQueue'
import type {
  OutboxEventDeliveryRepository,
  OutboxEventForDelivery,
  PendingOutboxEnqueue,
} from '../../src/application/ports/OutboxEventDeliveryRepository'
import { ReconcilePendingOutboxEnqueues } from '../../src/application/use-cases/ReconcilePendingOutboxEnqueues'

class OutboxEventDeliveryRepositoryFake implements OutboxEventDeliveryRepository {
  readonly enqueued: string[] = []
  readonly failures: Array<{ eventId: string; message: string }> = []

  constructor(private readonly pending: PendingOutboxEnqueue[]) {}

  async findByEventId(_eventId: string): Promise<OutboxEventForDelivery | null> {
    return null
  }

  async findPendingEnqueues(_limit: number): Promise<PendingOutboxEnqueue[]> {
    return this.pending
  }

  async markAsEnqueued(eventId: string): Promise<void> {
    this.enqueued.push(eventId)
  }

  async registerEnqueueFailure(eventId: string, message: string): Promise<void> {
    this.failures.push({ eventId, message })
  }

  async markAsProcessed(_eventId: string): Promise<void> {}
}

describe('ReconcilePendingOutboxEnqueues', () => {
  it('enqueues every pending event and records the successful enqueue', async () => {
    const outbox = new OutboxEventDeliveryRepositoryFake([
      { eventId: 'event-1' },
      { eventId: 'event-2' },
    ])
    const enqueued: string[] = []
    const queue: AffiliateProductImportJobQueue = {
      enqueue: async (eventId) => void enqueued.push(eventId),
    }

    const output = await new ReconcilePendingOutboxEnqueues(outbox, queue).execute()

    expect(output).toEqual({ enqueued: 2, failed: 0 })
    expect(enqueued).toEqual(['event-1', 'event-2'])
    expect(outbox.enqueued).toEqual(['event-1', 'event-2'])
    expect(outbox.failures).toEqual([])
  })

  it('records an enqueue failure and continues reconciling the remaining events', async () => {
    const outbox = new OutboxEventDeliveryRepositoryFake([
      { eventId: 'event-1' },
      { eventId: 'event-2' },
    ])
    const queue: AffiliateProductImportJobQueue = {
      enqueue: async (eventId) => {
        if (eventId === 'event-1') throw new Error('Redis is unavailable')
      },
    }

    const output = await new ReconcilePendingOutboxEnqueues(outbox, queue).execute()

    expect(output).toEqual({ enqueued: 1, failed: 1 })
    expect(outbox.enqueued).toEqual(['event-2'])
    expect(outbox.failures).toEqual([{ eventId: 'event-1', message: 'Redis is unavailable' }])
  })
})
