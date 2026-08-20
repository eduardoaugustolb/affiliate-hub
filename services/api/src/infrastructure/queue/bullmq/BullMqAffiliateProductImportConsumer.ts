import type { DeliverAffiliateProductImport } from '@affiliate-hub/affiliate-sync'
import { Worker } from 'bullmq'
import { env } from '../../../env'
import { EVENT_NAME } from './BullMqAffiliateProductImportJobQueue'
import { configureBullMq } from './configureBullMq'

export function createBullMqAffiliateProductImportConsumer(
  delivery: DeliverAffiliateProductImport,
  queueName = EVENT_NAME,
) {
  configureBullMq()
  return new Worker(
    queueName,
    async (job) => {
      if (
        !job.data.eventId ||
        typeof job.data.eventId !== 'string' ||
        job.data.eventId.trim() === ''
      ) {
        console.warn('Invalid job data', { eventId: job.data.eventId, id: job.data.id })
        return
      }
      const output = await delivery.execute({ eventId: job.data.eventId })
      if (output.status === 'event-not-found') {
        console.warn('Outbox event not found', { eventId: job.data.eventId })
      }
    },
    { connection: { url: env.REDIS_URL } },
  )
}
