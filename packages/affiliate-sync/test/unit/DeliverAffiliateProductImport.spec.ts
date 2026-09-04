import { describe, expect, it } from 'bun:test'
import type { AffiliateProductImportRequestedEventHandler } from '../../src/application/ports/AffiliateProductImportRequestedEventHandler'
import type {
  OutboxEventDeliveryRepository,
  OutboxEventForDelivery,
  PendingOutboxEnqueue,
} from '../../src/application/ports/OutboxEventDeliveryRepository'
import { DeliverAffiliateProductImport } from '../../src/application/use-cases/DeliverAffiliateProductImport'

class OutboxEventDeliveryRepositoryFake implements OutboxEventDeliveryRepository {
  readonly processed: string[] = []

  constructor(private readonly event: OutboxEventForDelivery | null) {}

  async findByEventId(_eventId: string): Promise<OutboxEventForDelivery | null> {
    return this.event
  }

  async findPendingEnqueues(_limit: number): Promise<PendingOutboxEnqueue[]> {
    return []
  }

  async markAsEnqueued(_eventId: string): Promise<void> {}

  async registerEnqueueFailure(_eventId: string, _message: string): Promise<void> {}

  async markAsProcessed(eventId: string): Promise<void> {
    this.processed.push(eventId)
  }
}

const event: OutboxEventForDelivery = {
  eventId: 'event-1',
  name: 'AffiliateProductImportRequested',
  payload: {},
  processedAt: null,
}

describe('DeliverAffiliateProductImport', () => {
  it('delivers the event through the handler and marks it as processed', async () => {
    const outbox = new OutboxEventDeliveryRepositoryFake(event)
    const handled: string[] = []
    const handler: AffiliateProductImportRequestedEventHandler = async (receivedEvent) => {
      handled.push(receivedEvent.eventId)
    }

    const output = await new DeliverAffiliateProductImport(outbox, handler).execute({
      eventId: event.eventId,
    })

    expect(output).toEqual({ status: 'delivered' })
    expect(handled).toEqual(['event-1'])
    expect(outbox.processed).toEqual(['event-1'])
  })

  it('does not invoke the handler for an unknown or already processed event', async () => {
    const handler: AffiliateProductImportRequestedEventHandler = async () => {
      throw new Error('handler must not run')
    }

    const notFound = await new DeliverAffiliateProductImport(
      new OutboxEventDeliveryRepositoryFake(null),
      handler,
    ).execute({ eventId: 'missing' })
    const alreadyProcessed = await new DeliverAffiliateProductImport(
      new OutboxEventDeliveryRepositoryFake({ ...event, processedAt: '2026-08-20T00:00:00.000Z' }),
      handler,
    ).execute({ eventId: event.eventId })

    expect(notFound).toEqual({ status: 'event-not-found' })
    expect(alreadyProcessed).toEqual({ status: 'already-processed' })
  })

  it('rejects an event with a different name without marking it as processed', async () => {
    const outbox = new OutboxEventDeliveryRepositoryFake({ ...event, name: 'UnexpectedEvent' })
    const handler: AffiliateProductImportRequestedEventHandler = async () => undefined

    await expect(
      new DeliverAffiliateProductImport(outbox, handler).execute({ eventId: event.eventId }),
    ).rejects.toThrow('Unexpected event name: UnexpectedEvent')
    expect(outbox.processed).toEqual([])
  })
})
