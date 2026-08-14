import { describe, expect, it } from 'bun:test'
import type { IntegrationEventPublisher } from '../src/application/ports/IntegrationEventPublisher'
import { ImportProductFromFeed } from '../src/application/use-cases/ImportProductFromFeed'

describe('ImportProductFromFeed', () => {
  it('publishes the normalized product as an integration event', async () => {
    const events: unknown[] = []
    const publisher: IntegrationEventPublisher = {
      publish: async (event) => void events.push(event),
    }
    const useCase = new ImportProductFromFeed(publisher, { generate: () => 'event-123' })

    const output = await useCase.execute({
      externalProductId: 'shopee-1',
      name: 'Moletom',
      category: 'streetwear',
    })

    expect(output).toEqual({ eventId: 'event-123' })
    expect(events).toHaveLength(1)
    expect(events[0]).toMatchObject({
      id: 'event-123',
      name: 'AffiliateProductImportRequested',
      payload: { externalProductId: 'shopee-1', name: 'Moletom', category: 'streetwear' },
    })
  })
})
