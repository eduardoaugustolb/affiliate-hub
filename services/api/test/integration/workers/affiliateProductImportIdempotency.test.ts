import { describe, expect, it } from 'bun:test'
import { randomUUID } from 'node:crypto'
import {
  DeliverAffiliateProductImport,
  type OutboxEventDeliveryRepository,
} from '@affiliate-hub/affiliate-sync'
import {
  SqlOutboxEventDeliveryRepository,
  SqlOutboxIntegrationEventPublisher,
} from '@affiliate-hub/affiliate-sync/infrastructure'
import type { AffiliateProductImportRequested } from '@affiliate-hub/contracts'
import type { Queue, Worker } from 'bullmq'
import { SystemClock } from '../../../src/adapters/clock/SystemClock'
import { IdGeneratorBun } from '../../../src/adapters/crypto/IdGeneratorBun'
import { PgAdapter } from '../../../src/adapters/database/PgAdapter'
import { handleAffiliateProductImportRequested } from '../../../src/infrastructure/event-handlers/handleAffiliateProductImportRequested'
import { createBullMqAffiliateProductImportConsumer } from '../../../src/infrastructure/queue/bullmq/BullMqAffiliateProductImportConsumer'
import { EVENT_NAME } from '../../../src/infrastructure/queue/bullmq/BullMqAffiliateProductImportJobQueue'
import { createAffiliateProductImportQueue } from '../../../src/infrastructure/queue/bullmq/createAffiliateProductImportQueue'

const DATABASE_URL =
  process.env.DATABASE_URL ?? 'postgres://postgres:postgres@localhost:5433/drops_do_frost'
const clock = new SystemClock()
const occurredAt = new Date('2026-08-20T12:00:00.000Z')

describe('affiliate product import idempotency (integration)', () => {
  it('completes a redelivered event without calling Catalog a second time', async () => {
    const marker = `IDEMPOTENCY-REDELIVERY-${randomUUID()}`
    const externalProductId = `shopee-${marker}`
    const queueName = `affiliate-product-import-redelivery-${randomUUID()}`
    const eventId = randomUUID()
    const db = new PgAdapter(DATABASE_URL)
    let queue: Queue | undefined
    let worker: Worker | undefined

    try {
      queue = createAffiliateProductImportQueue(queueName)
      const handler = handleAffiliateProductImportRequested(db, new IdGeneratorBun(), clock)
      let handlerCalls = 0
      worker = createBullMqAffiliateProductImportConsumer(
        new DeliverAffiliateProductImport(
          new SqlOutboxEventDeliveryRepository(db),
          async (event) => {
            handlerCalls += 1
            await handler(event)
          },
        ),
        queueName,
      )
      await Promise.all([queue.waitUntilReady(), worker.waitUntilReady()])
      await queue.obliterate({ force: true })

      await publishEvent(db, createEvent(eventId, externalProductId, marker))
      await queue.add(EVENT_NAME, { eventId }, { jobId: eventId })
      await waitForProcessedEvent(db, eventId)

      const redeliveryJobId = `${eventId}-redelivery`
      await queue.add(EVENT_NAME, { eventId }, { jobId: redeliveryJobId })
      await waitForJobState(queue, redeliveryJobId, 'completed')

      expect(handlerCalls).toBe(1)
      await expectSingleProductAndMapping(db, marker, externalProductId)
    } finally {
      await closeQueueAndWorker(queue, worker)
      await cleanup(db, marker, externalProductId)
      await db.close()
    }
  })

  it('lets two workers process different events for the same provider identity without duplicating Product', async () => {
    const marker = `IDEMPOTENCY-CONCURRENT-${randomUUID()}`
    const externalProductId = `shopee-${marker}`
    const queueName = `affiliate-product-import-concurrent-${randomUUID()}`
    const firstEventId = randomUUID()
    const secondEventId = randomUUID()
    const observerDb = new PgAdapter(DATABASE_URL)
    const firstWorkerDb = new PgAdapter(DATABASE_URL)
    const secondWorkerDb = new PgAdapter(DATABASE_URL)
    const failures: string[] = []
    let queue: Queue | undefined
    let firstWorker: Worker | undefined
    let secondWorker: Worker | undefined

    try {
      queue = createAffiliateProductImportQueue(queueName)
      let arrivals = 0
      let releaseHandlers: (() => void) | undefined
      const bothHandlersStarted = new Promise<void>((resolve) => {
        releaseHandlers = resolve
      })
      const createGatedHandler = (db: PgAdapter) => {
        const handler = handleAffiliateProductImportRequested(db, new IdGeneratorBun(), clock)
        return async (event: Parameters<typeof handler>[0]) => {
          arrivals += 1
          if (arrivals === 2) releaseHandlers?.()
          await Promise.race([bothHandlersStarted, Bun.sleep(1_000)])
          await handler(event)
        }
      }

      firstWorker = createBullMqAffiliateProductImportConsumer(
        new DeliverAffiliateProductImport(
          new SqlOutboxEventDeliveryRepository(firstWorkerDb),
          createGatedHandler(firstWorkerDb),
        ),
        queueName,
      )
      secondWorker = createBullMqAffiliateProductImportConsumer(
        new DeliverAffiliateProductImport(
          new SqlOutboxEventDeliveryRepository(secondWorkerDb),
          createGatedHandler(secondWorkerDb),
        ),
        queueName,
      )
      firstWorker.on('failed', (_job, error) => failures.push(error.message))
      secondWorker.on('failed', (_job, error) => failures.push(error.message))
      await Promise.all([
        queue.waitUntilReady(),
        firstWorker.waitUntilReady(),
        secondWorker.waitUntilReady(),
      ])
      await queue.obliterate({ force: true })

      await publishEvent(observerDb, createEvent(firstEventId, externalProductId, marker))
      await publishEvent(observerDb, createEvent(secondEventId, externalProductId, marker))
      await queue.add(EVENT_NAME, { eventId: firstEventId }, { jobId: firstEventId })
      await queue.add(EVENT_NAME, { eventId: secondEventId }, { jobId: secondEventId })

      try {
        await Promise.all([
          waitForProcessedEvent(observerDb, firstEventId),
          waitForProcessedEvent(observerDb, secondEventId),
        ])
      } catch (error) {
        throw new Error(
          `${error instanceof Error ? error.message : error}; worker failures: ${failures.join('; ')}`,
        )
      }

      expect(arrivals).toBe(2)
      await expectSingleProductAndMapping(observerDb, marker, externalProductId)
    } finally {
      await closeQueueAndWorker(queue, firstWorker)
      await secondWorker?.close()
      await cleanup(observerDb, marker, externalProductId)
      await Promise.all([observerDb.close(), firstWorkerDb.close(), secondWorkerDb.close()])
    }
  }, 15_000)

  it('retries after processed_at fails after the Catalog transaction commits', async () => {
    const marker = `IDEMPOTENCY-POST-COMMIT-${randomUUID()}`
    const externalProductId = `shopee-${marker}`
    const queueName = `affiliate-product-import-post-commit-${randomUUID()}`
    const eventId = randomUUID()
    const db = new PgAdapter(DATABASE_URL)
    let queue: Queue | undefined
    let worker: Worker | undefined

    try {
      queue = createAffiliateProductImportQueue(queueName)
      const repository = new SqlOutboxEventDeliveryRepository(db)
      let markAttempts = 0
      const repositoryThatFailsOnce: OutboxEventDeliveryRepository = {
        findByEventId: (id) => repository.findByEventId(id),
        findPendingEnqueues: (limit) => repository.findPendingEnqueues(limit),
        markAsProcessed: async (id) => {
          markAttempts += 1
          if (markAttempts === 1) throw new Error('processed_at temporarily unavailable')
          await repository.markAsProcessed(id)
        },
        registerEnqueueFailure: async (_, _m) => {},
        markAsEnqueued: async (_) => {},
      }
      worker = createBullMqAffiliateProductImportConsumer(
        new DeliverAffiliateProductImport(
          repositoryThatFailsOnce,
          handleAffiliateProductImportRequested(db, new IdGeneratorBun(), clock),
        ),
        queueName,
      )
      await Promise.all([queue.waitUntilReady(), worker.waitUntilReady()])
      await queue.obliterate({ force: true })

      await publishEvent(db, createEvent(eventId, externalProductId, marker))
      await queue.add(
        EVENT_NAME,
        { eventId },
        {
          attempts: 2,
          backoff: { type: 'fixed', delay: 0 },
          jobId: eventId,
        },
      )

      await waitForProcessedEvent(db, eventId)
      await waitForJobState(queue, eventId, 'completed')

      expect(markAttempts).toBe(2)
      await expectSingleProductAndMapping(db, marker, externalProductId)
    } finally {
      await closeQueueAndWorker(queue, worker)
      await cleanup(db, marker, externalProductId)
      await db.close()
    }
  })
})

function createEvent(
  eventId: string,
  externalProductId: string,
  name: string,
): AffiliateProductImportRequested {
  return {
    id: eventId,
    name: 'AffiliateProductImportRequested',
    occurredAt: occurredAt.toISOString(),
    payload: { externalProductId, name, provider: 'shopee', category: 'streetwear' },
  }
}

async function publishEvent(db: PgAdapter, event: AffiliateProductImportRequested): Promise<void> {
  await new SqlOutboxIntegrationEventPublisher(db).publish(event)
}

async function expectSingleProductAndMapping(
  db: PgAdapter,
  name: string,
  externalProductId: string,
): Promise<void> {
  const [products, mappings] = await Promise.all([
    db.query<{ count: string }>('select count(*)::text as count from products where name = $1', [
      name,
    ]),
    db.query<{ count: string }>(
      'select count(*)::text as count from affiliate_product_imports where provider = $1 and external_product_id = $2',
      ['shopee', externalProductId],
    ),
  ])

  expect(products[0]?.count).toBe('1')
  expect(mappings[0]?.count).toBe('1')
}

async function waitForProcessedEvent(db: PgAdapter, eventId: string): Promise<void> {
  for (let attempt = 0; attempt < 100; attempt += 1) {
    const rows = await db.query<{ processed_at: Date | null }>(
      'select processed_at from outbox_events where event_id = $1',
      [eventId],
    )
    if (rows[0]?.processed_at) return
    await Bun.sleep(50)
  }
  throw new Error(`Outbox event ${eventId} was not processed by the worker`)
}

async function waitForJobState(queue: Queue, jobId: string, expectedState: string): Promise<void> {
  for (let attempt = 0; attempt < 100; attempt += 1) {
    const job = await queue.getJob(jobId)
    if ((await job?.getState()) === expectedState) return
    await Bun.sleep(50)
  }
  throw new Error(`Job ${jobId} did not reach ${expectedState}`)
}

async function closeQueueAndWorker(
  queue: Queue | undefined,
  worker: Worker | undefined,
): Promise<void> {
  await worker?.close()
  if (queue) {
    await queue.obliterate({ force: true })
    await queue.close()
  }
}

async function cleanup(db: PgAdapter, marker: string, externalProductId: string): Promise<void> {
  await db.query('delete from outbox_events where payload::text like $1', [`%${marker}%`])
  await db.query(
    'delete from affiliate_product_imports where provider = $1 and external_product_id = $2',
    ['shopee', externalProductId],
  )
  await db.query('delete from products where name = $1', [marker])
}
