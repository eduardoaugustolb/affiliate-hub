import {
  DeliverAffiliateProductImport,
  ReconcilePendingOutboxEnqueues,
} from '@affiliate-hub/affiliate-sync'
import { SqlOutboxEventDeliveryRepository } from '@affiliate-hub/affiliate-sync/infrastructure'
import { SystemClock } from '../../adapters/clock/SystemClock'
import { IdGeneratorBun } from '../../adapters/crypto/IdGeneratorBun'
import { PgAdapter } from '../../adapters/database/PgAdapter'
import { env } from '../../env'
import { handleAffiliateProductImportRequested } from '../../infrastructure/event-handlers/handleAffiliateProductImportRequested'
import { JsonLogger } from '../../infrastructure/observability/JsonLogger'
import { SqlAffiliateImportOutboxMetrics } from '../../infrastructure/observability/SqlAffiliateImportOutboxMetrics'
import { createWorkerMetricsServer } from '../../infrastructure/observability/WorkerMetricsServer'
import { createBullMqAffiliateProductImportConsumer } from '../../infrastructure/queue/bullmq/BullMqAffiliateProductImportConsumer'
import { BullMqAffiliateProductImportJobQueue } from '../../infrastructure/queue/bullmq/BullMqAffiliateProductImportJobQueue'
import { createAffiliateProductImportQueue } from '../../infrastructure/queue/bullmq/createAffiliateProductImportQueue'
import { IntervalTaskScheduler } from '../../infrastructure/scheduling/IntervalTaskScheduler'

const RECONCILIATION_INTERVAL_MS = 5 * 60 * 1_000

async function main(): Promise<void> {
  const clock = new SystemClock()
  const logger = new JsonLogger(clock).child({ service: 'affiliate-import-worker' })
  const db = new PgAdapter(env.DATABASE_URL)
  const deliveryRepository = new SqlOutboxEventDeliveryRepository(db)
  const delivery = new DeliverAffiliateProductImport(
    deliveryRepository,
    handleAffiliateProductImportRequested(db, new IdGeneratorBun(), clock),
  )
  const queue = createAffiliateProductImportQueue()
  const worker = createBullMqAffiliateProductImportConsumer(
    delivery,
    undefined,
    logger.child({ component: 'bullmq-affiliate-product-import-consumer' }),
  )
  const metricsServer = createWorkerMetricsServer(
    queue,
    new SqlAffiliateImportOutboxMetrics(db),
    env.WORKER_METRICS_PORT,
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
        logger.info('affiliate_import.outbox_reconciliation_completed', { ...output })
    },
  )

  await worker.waitUntilReady()
  logger.info('affiliate_import.worker_ready', { metricsPort: env.WORKER_METRICS_PORT })

  let shuttingDown = false
  const shutdown = async (signal: string): Promise<void> => {
    if (shuttingDown) return
    shuttingDown = true

    logger.info('affiliate_import.worker_stopping', { signal })
    scheduledReconciliation.close()
    await worker.close()
    await queue.close()
    metricsServer.stop(true)
    await db.close()
    process.exit(0)
  }

  process.once('SIGINT', () => void shutdown('SIGINT'))
  process.once('SIGTERM', () => void shutdown('SIGTERM'))
}

if (import.meta.main) {
  main().catch((error) => {
    new JsonLogger(new SystemClock()).error('affiliate_import.worker_start_failed', error)
    process.exit(1)
  })
}
