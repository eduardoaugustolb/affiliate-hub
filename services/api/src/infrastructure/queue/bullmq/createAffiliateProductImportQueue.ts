import { Queue } from 'bullmq'
import { EVENT_NAME } from './BullMqAffiliateProductImportJobQueue'
import { configureBullMq } from './configureBullMq'

export function createAffiliateProductImportQueue(queueName = EVENT_NAME) {
  configureBullMq()
  return new Queue(queueName)
}
