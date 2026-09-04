import type { DeliverAffiliateProductImport } from '@affiliate-hub/affiliate-sync'
import { Worker } from 'bullmq'
import { env } from '../../../env'
import { JsonLogger } from '../../observability/JsonLogger'
import { EVENT_NAME } from './BullMqAffiliateProductImportJobQueue'
import { configureBullMq } from './configureBullMq'

export function createBullMqAffiliateProductImportConsumer(
  delivery: DeliverAffiliateProductImport,
  queueName = EVENT_NAME,
  logger = new JsonLogger().child({
    component: 'bullmq-affiliate-product-import-consumer',
    queueName,
  }),
) {
  configureBullMq()
  return new Worker(
    queueName,
    async (job) => {
      const eventId = job.data.eventId
      if (!eventId || typeof eventId !== 'string' || eventId.trim() === '') {
        logger.warn('affiliate_import.job.invalid', { jobId: job.id ?? null })
        return
      }

      const fields = {
        eventId,
        jobId: job.id ?? null,
        attempt: job.attemptsMade + 1,
      }
      const startedAt = performance.now()
      logger.info('affiliate_import.job.started', fields)

      try {
        const output = await delivery.execute({ eventId })
        const durationMs = Math.round(performance.now() - startedAt)

        if (output.status === 'event-not-found') {
          logger.warn('affiliate_import.outbox_event_not_found', { ...fields, durationMs })
          return
        }

        logger.info('affiliate_import.job.completed', {
          ...fields,
          durationMs,
          status: output.status,
        })
      } catch (error) {
        logger.error('affiliate_import.job.failed', error, {
          ...fields,
          durationMs: Math.round(performance.now() - startedAt),
        })
        throw error
      }
    },
    { connection: { url: env.REDIS_URL } },
  )
}
