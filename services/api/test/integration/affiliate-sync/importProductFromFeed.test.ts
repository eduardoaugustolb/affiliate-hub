import { describe, expect, it } from 'bun:test'
import { randomUUID } from 'node:crypto'
import {
  type AffiliateProductImportJobQueue,
  ImportProductFromFeed,
  ReconcilePendingOutboxEnqueues,
} from '@affiliate-hub/affiliate-sync'
import {
  SqlOutboxEventDeliveryRepository,
  SqlOutboxIntegrationEventPublisher,
} from '@affiliate-hub/affiliate-sync/infrastructure'
import type { Queue } from 'bullmq'
import { IdGeneratorBun } from '../../../src/adapters/crypto/IdGeneratorBun'
import { PgAdapter } from '../../../src/adapters/database/PgAdapter'
import { BullMqAffiliateProductImportJobQueue } from '../../../src/infrastructure/queue/bullmq/BullMqAffiliateProductImportJobQueue'
import { createAffiliateProductImportQueue } from '../../../src/infrastructure/queue/bullmq/createAffiliateProductImportQueue'

const DATABASE_URL =
  process.env.DATABASE_URL ?? 'postgres://postgres:postgres@localhost:5433/drops_do_frost'

describe('ImportProductFromFeed (integration)', () => {
  it('persists the event, creates a Redis job and records the enqueue state', async () => {
    const marker = `INTEGRATION-AFFILIATE-QUEUE-${randomUUID()}`
    const db = new PgAdapter(DATABASE_URL)
    let queue: Queue | undefined

    try {
      queue = createAffiliateProductImportQueue(`affiliate-product-import-test-${randomUUID()}`)
      await queue.waitUntilReady()
      await queue.obliterate({ force: true })
      const useCase = new ImportProductFromFeed(
        new SqlOutboxIntegrationEventPublisher(db),
        new BullMqAffiliateProductImportJobQueue(queue),
        new IdGeneratorBun(),
        new SqlOutboxEventDeliveryRepository(db),
      )

      const output = await useCase.execute({
        externalProductId: `shopee-${marker}`,
        name: marker,
        category: 'streetwear',
        provider: 'shopee',
      })
      const rows = await db.query<{
        enqueued_at: Date | null
        enqueue_attempts: number
        last_enqueue_error: string | null
      }>(
        'select enqueued_at, enqueue_attempts, last_enqueue_error from outbox_events where event_id = $1',
        [output.eventId],
      )

      expect(output.queuedImmediately).toBe(true)
      expect((await queue.getJob(output.eventId))?.data).toEqual({ eventId: output.eventId })
      expect(rows).toEqual([
        { enqueued_at: expect.any(Date), enqueue_attempts: 0, last_enqueue_error: null },
      ])
    } finally {
      await queue?.obliterate({ force: true })
      await queue?.close()
      await db.query('delete from outbox_events where payload::text like $1', [`%${marker}%`])
      await db.close()
    }
  })

  it('keeps the event recoverable and records the Redis error when enqueue fails', async () => {
    const marker = `INTEGRATION-AFFILIATE-REDIS-DOWN-${randomUUID()}`
    const db = new PgAdapter(DATABASE_URL)
    const unavailableQueue: AffiliateProductImportJobQueue = {
      enqueue: async () => {
        throw new Error('Redis is unavailable')
      },
    }

    try {
      const useCase = new ImportProductFromFeed(
        new SqlOutboxIntegrationEventPublisher(db),
        unavailableQueue,
        new IdGeneratorBun(),
        new SqlOutboxEventDeliveryRepository(db),
      )

      const output = await useCase.execute({
        externalProductId: `shopee-${marker}`,
        name: marker,
        category: 'streetwear',
        provider: 'shopee',
      })
      const rows = await db.query<{
        enqueued_at: Date | null
        enqueue_attempts: number
        last_enqueue_error: string | null
      }>(
        'select enqueued_at, enqueue_attempts, last_enqueue_error from outbox_events where event_id = $1',
        [output.eventId],
      )

      expect(output.queuedImmediately).toBe(false)
      expect(rows).toEqual([
        { enqueued_at: null, enqueue_attempts: 1, last_enqueue_error: 'Redis is unavailable' },
      ])
    } finally {
      await db.query('delete from outbox_events where payload::text like $1', [`%${marker}%`])
      await db.close()
    }
  })

  it('re-enqueues an event after Redis becomes available again', async () => {
    const marker = `INTEGRATION-AFFILIATE-RECOVERY-${randomUUID()}`
    const db = new PgAdapter(DATABASE_URL)
    let queue: Queue | undefined
    const unavailableQueue: AffiliateProductImportJobQueue = {
      enqueue: async () => {
        throw new Error('Redis is unavailable')
      },
    }

    try {
      const deliveryRepository = new SqlOutboxEventDeliveryRepository(db)
      const useCase = new ImportProductFromFeed(
        new SqlOutboxIntegrationEventPublisher(db),
        unavailableQueue,
        new IdGeneratorBun(),
        deliveryRepository,
      )
      const output = await useCase.execute({
        externalProductId: `shopee-${marker}`,
        name: marker,
        category: 'streetwear',
        provider: 'shopee',
      })

      queue = createAffiliateProductImportQueue(`affiliate-product-import-test-${randomUUID()}`)
      await queue.waitUntilReady()
      await queue.obliterate({ force: true })
      const reconciliation = await new ReconcilePendingOutboxEnqueues(
        deliveryRepository,
        new BullMqAffiliateProductImportJobQueue(queue),
      ).execute()
      const rows = await db.query<{
        enqueued_at: Date | null
        enqueue_attempts: number
        last_enqueue_error: string | null
      }>(
        'select enqueued_at, enqueue_attempts, last_enqueue_error from outbox_events where event_id = $1',
        [output.eventId],
      )

      expect(reconciliation.enqueued).toBeGreaterThanOrEqual(1)
      expect(reconciliation.failed).toBe(0)
      expect((await queue.getJob(output.eventId))?.data).toEqual({ eventId: output.eventId })
      expect(rows).toEqual([
        { enqueued_at: expect.any(Date), enqueue_attempts: 1, last_enqueue_error: null },
      ])
    } finally {
      await queue?.obliterate({ force: true })
      await queue?.close()
      await db.query('delete from outbox_events where payload::text like $1', [`%${marker}%`])
      await db.close()
    }
  })
})
