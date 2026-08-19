import { Queue } from 'bullmq'
import { EVENT_NAME } from './BullMqAffiliateProductImportJobQueue'
import { configureBullMq } from './configureBullMq'

export function createAffiliateProductionImportQueue(queueName = EVENT_NAME) {
  configureBullMq()
  return new Queue(queueName)
}
