import type { OutboxEventDeliveryRepository } from '@affiliate-hub/affiliate-sync'
import { Worker } from 'bullmq'
import { env } from '../../../env'
import type { AffiliateProductImportRequestedHandler } from '../../event-handlers/handleAffiliateProductImportRequested'
import { EVENT_NAME } from './BullMqAffiliateProductImportJobQueue'
import { configureBullMq } from './configureBullMq'

export function createBullMqAffiliateProductImportConsumer(
  deliveryRepository: OutboxEventDeliveryRepository,
  handler: AffiliateProductImportRequestedHandler,
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
      const event = await deliveryRepository.findByEventId(job.data.eventId)

      if (!event) {
        console.warn('Outbox event not found', { eventId: job.data.eventId })
        return
      }

      if (event.processedAt) {
        return
      }

      if (event.name !== 'AffiliateProductImportRequested') {
        throw new Error(`Unexpected event name: ${event.name}`)
      }

      await handler(event)
      await deliveryRepository.markAsProcessed(event.eventId)
    },
    { connection: { url: env.REDIS_URL } },
  )
}
