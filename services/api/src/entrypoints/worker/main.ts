import {
  ReconcilePendingOutboxEnqueues,
  SqlOutboxEventDeliveryRepository,
} from '@affiliate-hub/affiliate-sync'
import { IdGeneratorBun } from '../../adapters/crypto/IdGeneratorBun'
import { PgAdapter } from '../../adapters/database/PgAdapter'
import { env } from '../../env'
import { handleAffiliateProductImportRequested } from '../../infrastructure/event-handlers/handleAffiliateProductImportRequested'
import { createBullMqAffiliateProductImportConsumer } from '../../infrastructure/queue/bullmq/BullMqAffiliateProductImportConsumer'
import { BullMqAffiliateProductImportJobQueue } from '../../infrastructure/queue/bullmq/BullMqAffiliateProductImportJobQueue'
import { createAffiliateProductImportQueue } from '../../infrastructure/queue/bullmq/createAffiliateProductImportQueue'
import { IntervalTaskScheduler } from '../../infrastructure/scheduling/IntervalTaskScheduler'

const RECONCILIATION_INTERVAL_MS = 5 * 60 * 1_000

async function main(): Promise<void> {
  const db = new PgAdapter(env.DATABASE_URL)
  const deliveryRepository = new SqlOutboxEventDeliveryRepository(db)
  const queue = createAffiliateProductImportQueue()
  const worker = createBullMqAffiliateProductImportConsumer(
    deliveryRepository,
    handleAffiliateProductImportRequested(db, new IdGeneratorBun()),
  )
  const reconciler = new ReconcilePendingOutboxEnqueues(
    deliveryRepository,
    new BullMqAffiliateProductImportJobQueue(queue),
  )
  const scheduledReconciliation = new IntervalTaskScheduler().scheduleEvery(
    RECONCILIATION_INTERVAL_MS,
    async () => {
      const output = await reconciler.execute()
      if (output.enqueued > 0 || output.failed > 0)
        console.info('Outbox enqueue reconciliation completed', output)
    },
  )

  await worker.waitUntilReady()
  console.info('Affiliate product import worker is ready')

  let shuttingDown = false
  const shutdown = async (signal: string): Promise<void> => {
    if (shuttingDown) return
    shuttingDown = true

    console.info('Stopping affiliate product import worker', { signal })
    scheduledReconciliation.close()
    await worker.close()
    await queue.close()
    await db.close()
    process.exit(0)
  }

  process.once('SIGINT', () => void shutdown('SIGINT'))
  process.once('SIGTERM', () => void shutdown('SIGTERM'))
}

if (import.meta.main) {
  main().catch((error) => {
    console.error(error)
    process.exit(1)
  })
}
