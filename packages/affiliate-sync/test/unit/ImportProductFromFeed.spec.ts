import { describe, expect, it } from 'bun:test'
import type { AffiliateProductImportJobQueue } from '../../src/application/ports/AffiliateProductImportJobQueue'
import type { IntegrationEventPublisher } from '../../src/application/ports/IntegrationEventPublisher'
import { ImportProductFromFeed } from '../../src/application/use-cases/ImportProductFromFeed'

describe('ImportProductFromFeed', () => {
  it('publishes the normalized product as an integration event', async () => {
    const events: unknown[] = []
    const publisher: IntegrationEventPublisher = {
      publish: async (event) => void events.push(event),
    }
    const queue: AffiliateProductImportJobQueue = { enqueue: async () => undefined }
    const useCase = new ImportProductFromFeed(publisher, queue, { generate: () => 'event-123' })

    const output = await useCase.execute({
      externalProductId: 'shopee-1',
      name: 'Moletom',
      provider: 'shopee',
      category: 'streetwear',
    })

    expect(output).toEqual({ eventId: 'event-123', queuedImmediately: true })
    expect(events).toHaveLength(1)
    expect(events[0]).toMatchObject({
      id: 'event-123',
      name: 'AffiliateProductImportRequested',
      payload: {
        externalProductId: 'shopee-1',
        name: 'Moletom',
        provider: 'shopee',
        category: 'streetwear',
      },
    })
  })
})
