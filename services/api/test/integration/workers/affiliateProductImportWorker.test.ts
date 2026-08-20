import { describe, expect, it } from 'bun:test'
import { randomUUID } from 'node:crypto'
import {
  DeliverAffiliateProductImport,
  ImportProductFromFeed,
  SqlOutboxEventDeliveryRepository,
  SqlOutboxIntegrationEventPublisher,
} from '@affiliate-hub/affiliate-sync'
import type { Queue, Worker } from 'bullmq'
import { IdGeneratorBun } from '../../../src/adapters/crypto/IdGeneratorBun'
import { PgAdapter } from '../../../src/adapters/database/PgAdapter'
import { handleAffiliateProductImportRequested } from '../../../src/infrastructure/event-handlers/handleAffiliateProductImportRequested'
import { createBullMqAffiliateProductImportConsumer } from '../../../src/infrastructure/queue/bullmq/BullMqAffiliateProductImportConsumer'
import { BullMqAffiliateProductImportJobQueue } from '../../../src/infrastructure/queue/bullmq/BullMqAffiliateProductImportJobQueue'
import { createAffiliateProductImportQueue } from '../../../src/infrastructure/queue/bullmq/createAffiliateProductImportQueue'

const DATABASE_URL =
  process.env.DATABASE_URL ?? 'postgres://postgres:postgres@localhost:5433/drops_do_frost'

describe('affiliate product import worker (integration)', () => {
  it('delivers a Redis job through the outbox and creates one Catalog product and mapping', async () => {
    const marker = `INTEGRATION-WORKER-${randomUUID()}`
    const externalProductId = `shopee-${marker}`
    const queueName = `affiliate-product-import-test-${randomUUID()}`
    const db = new PgAdapter(DATABASE_URL)
    let queue: Queue | undefined
    let worker: Worker | undefined

    try {
      queue = createAffiliateProductImportQueue(queueName)
      worker = createBullMqAffiliateProductImportConsumer(
        new DeliverAffiliateProductImport(
          new SqlOutboxEventDeliveryRepository(db),
          handleAffiliateProductImportRequested(db, new IdGeneratorBun()),
        ),
        queueName,
      )
      await Promise.all([queue.waitUntilReady(), worker.waitUntilReady()])
      await queue.obliterate({ force: true })

      const importProductFromFeed = new ImportProductFromFeed(
        new SqlOutboxIntegrationEventPublisher(db),
        new BullMqAffiliateProductImportJobQueue(queue),
        new IdGeneratorBun(),
        new SqlOutboxEventDeliveryRepository(db),
      )
      const output = await importProductFromFeed.execute({
        externalProductId,
        name: marker,
        category: 'streetwear',
        provider: 'shopee',
      })

      const event = await waitForProcessedEvent(db, output.eventId)
      const productMappings = await db.query<{ count: string }>(
        'select count(*)::text as count from affiliate_product_imports where external_product_id = $1',
        [externalProductId],
      )
      const products = await db.query<{ count: string }>(
        'select count(*)::text as count from products where name = $1',
        [marker],
      )

      expect(output.queuedImmediately).toBe(true)
      expect(event.processed_at).not.toBeNull()
      expect(productMappings[0]?.count).toBe('1')
      expect(products[0]?.count).toBe('1')
    } finally {
      await worker?.close()
      if (queue) {
        await queue.obliterate({ force: true })
        await queue.close()
      }
      await db.query('delete from outbox_events where payload::text like $1', [`%${marker}%`])
      await db.query('delete from affiliate_product_imports where external_product_id = $1', [
        externalProductId,
      ])
      await db.query('delete from products where name = $1', [marker])
      await db.close()
    }
  })
})

async function waitForProcessedEvent(
  db: PgAdapter,
  eventId: string,
): Promise<{ processed_at: Date | null }> {
  for (let attempt = 0; attempt < 100; attempt += 1) {
    const rows = await db.query<{ processed_at: Date | null }>(
      'select processed_at from outbox_events where event_id = $1',
      [eventId],
    )
    const event = rows[0]
    if (event?.processed_at) return event
    await Bun.sleep(50)
  }

  throw new Error(`Outbox event ${eventId} was not processed by the worker`)
}
