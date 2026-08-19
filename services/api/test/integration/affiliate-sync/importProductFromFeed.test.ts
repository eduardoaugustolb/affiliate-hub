import { describe, expect, it } from 'bun:test'
import { randomUUID } from 'node:crypto'
import {
  type AffiliateProductImportJobQueue,
  ImportProductFromFeed,
  OutboxIntegrationEventPublisherSql,
} from '@affiliate-hub/affiliate-sync'
import type { Queue } from 'bullmq'
import { IdGeneratorBun } from '../../../src/adapters/crypto/IdGeneratorBun'
import { PgAdapter } from '../../../src/adapters/database/PgAdapter'
import { BullMqAffiliateProductImportJobQueue } from '../../../src/adapters/queue/BullMqAffiliateProductImportJobQueue'
import { createAffiliateProductionImportQueue } from '../../../src/adapters/queue/createAffiliateProductImportQueue'
import { handleAffiliateProductImportRequested } from '../../../src/workers/handlers/handleAffiliateProductImportRequested'
import { OutboxDispatcher } from '../../../src/workers/OutboxDispatcher'

const DATABASE_URL =
  process.env.DATABASE_URL ?? 'postgres://postgres:postgres@localhost:5433/drops_do_frost'

describe('ImportProductFromFeed (integration)', () => {
  it('persists, dispatches, imports and idempotently reprocesses an affiliate product', async () => {
    const marker = `INTEGRATION-AFFILIATE-${randomUUID()}`
    const externalProductId = `shopee-${marker}`
    const db = new PgAdapter(DATABASE_URL)

    try {
      const publisher = new OutboxIntegrationEventPublisherSql(db)
      const importProductFromFeed = new ImportProductFromFeed(
        publisher,
        { enqueue: async () => undefined },
        new IdGeneratorBun(),
      )
      const dispatcher = new OutboxDispatcher(db, {
        AffiliateProductImportRequested: handleAffiliateProductImportRequested(
          db,
          new IdGeneratorBun(),
        ),
      })

      const first = await importProductFromFeed.execute({
        externalProductId,
        name: marker,
        category: 'streetwear',
        provider: 'shopee',
      })

      await dispatchUntilProcessed(db, dispatcher, first.eventId)

      const firstRows = await db.query<{
        event_id: string
        processed_at: Date | null
        product_id: string
        product_name: string
      }>(
        `select event_id, processed_at, imports.product_id, products.name as product_name
         from outbox_events
         join affiliate_product_imports as imports on imports.external_product_id = $1
         join products on products.id = imports.product_id
         where event_id = $2`,
        [externalProductId, first.eventId],
      )

      expect(firstRows).toHaveLength(1)
      expect(firstRows[0]?.processed_at).not.toBeNull()
      expect(firstRows[0]?.product_name).toBe(marker)

      const second = await importProductFromFeed.execute({
        externalProductId,
        name: marker,
        category: 'streetwear',
        provider: 'shopee',
      })
      await dispatchUntilProcessed(db, dispatcher, second.eventId)

      const products = await db.query<{ count: string }>(
        'select count(*)::text as count from products where name = $1',
        [marker],
      )
      const mappings = await db.query<{ count: string }>(
        'select count(*)::text as count from affiliate_product_imports where external_product_id = $1',
        [externalProductId],
      )
      const secondEvent = await db.query<{ processed_at: Date | null }>(
        'select processed_at from outbox_events where event_id = $1',
        [second.eventId],
      )

      expect(products[0]?.count).toBe('1')
      expect(mappings[0]?.count).toBe('1')
      expect(secondEvent[0]?.processed_at).not.toBeNull()
    } finally {
      await db.query('delete from outbox_events where payload::text like $1', [`%${marker}%`])
      await db.query('delete from affiliate_product_imports where external_product_id = $1', [
        externalProductId,
      ])
      await db.query('delete from products where name = $1', [marker])
      await db.close()
    }
  })

  it('persists the event in PostgreSQL and creates its job in Redis', async () => {
    const marker = `INTEGRATION-AFFILIATE-QUEUE-${randomUUID()}`
    const externalProductId = `shopee-${marker}`
    const db = new PgAdapter(DATABASE_URL)
    let queue: Queue | undefined

    try {
      queue = createAffiliateProductionImportQueue(`affiliate-product-import-test-${randomUUID()}`)
      await queue.waitUntilReady()
      await queue.obliterate({ force: true })

      const importProductFromFeed = new ImportProductFromFeed(
        new OutboxIntegrationEventPublisherSql(db),
        new BullMqAffiliateProductImportJobQueue(queue),
        new IdGeneratorBun(),
      )
      const output = await importProductFromFeed.execute({
        externalProductId,
        name: marker,
        category: 'streetwear',
        provider: 'shopee',
      })

      const events = await db.query<{ event_id: string; name: string }>(
        'select event_id, name from outbox_events where event_id = $1',
        [output.eventId],
      )
      const job = await queue.getJob(output.eventId)

      expect(output.queuedImmediately).toBe(true)
      expect(events).toEqual([
        { event_id: output.eventId, name: 'AffiliateProductImportRequested' },
      ])
      expect(job?.data).toEqual({ eventId: output.eventId })
    } finally {
      if (queue) {
        await queue.obliterate({ force: true })
        await queue.close()
      }
      await db.query('delete from outbox_events where payload::text like $1', [`%${marker}%`])
      await db.close()
    }
  })

  it('persists the event and reports deferred delivery when Redis is unavailable', async () => {
    const marker = `INTEGRATION-AFFILIATE-REDIS-DOWN-${randomUUID()}`
    const externalProductId = `shopee-${marker}`
    const db = new PgAdapter(DATABASE_URL)
    let queue: Queue | undefined

    try {
      queue = createAffiliateProductionImportQueue(`affiliate-product-import-test-${randomUUID()}`)
      await queue.waitUntilReady()
      await queue.obliterate({ force: true })

      const unavailableQueue: AffiliateProductImportJobQueue = {
        enqueue: async () => {
          throw new Error('Redis is unavailable')
        },
      }
      const importProductFromFeed = new ImportProductFromFeed(
        new OutboxIntegrationEventPublisherSql(db),
        unavailableQueue,
        new IdGeneratorBun(),
      )
      const output = await importProductFromFeed.execute({
        externalProductId,
        name: marker,
        category: 'streetwear',
        provider: 'shopee',
      })

      const events = await db.query<{ event_id: string }>(
        'select event_id from outbox_events where event_id = $1',
        [output.eventId],
      )

      expect(events).toEqual([{ event_id: output.eventId }])
      expect(await queue.getJob(output.eventId)).toBeUndefined()
      expect(output.queuedImmediately).toBe(false)
    } finally {
      if (queue) {
        await queue.obliterate({ force: true })
        await queue.close()
      }
      await db.query('delete from outbox_events where payload::text like $1', [`%${marker}%`])
      await db.close()
    }
  })
})

async function dispatchUntilProcessed(
  db: PgAdapter,
  dispatcher: OutboxDispatcher,
  eventId: string,
): Promise<void> {
  for (let attempt = 0; attempt < 20; attempt += 1) {
    await dispatcher.dispatchOne()
    const rows = await db.query<{ processed_at: Date | null }>(
      'select processed_at from outbox_events where event_id = $1',
      [eventId],
    )
    if (rows[0]?.processed_at) return
  }
  const rows = await db.query<{ last_error: string | null }>(
    'select last_error from outbox_events where event_id = $1',
    [eventId],
  )
  throw new Error(`Outbox event ${eventId} was not processed: ${rows[0]?.last_error}`)
}
