import { afterEach, describe, expect, it } from 'bun:test'
import { randomUUID } from 'node:crypto'
import type { Queue } from 'bullmq'
import { BullMqAffiliateProductImportJobQueue } from '../../../src/adapters/queue/BullMqAffiliateProductImportJobQueue'
import { createAffiliateProductionImportQueue } from '../../../src/adapters/queue/createAffiliateProductImportQueue'

describe('BullMqAffiliateProductImportJobQueue (integration)', () => {
  let queue: Queue | undefined

  afterEach(async () => {
    if (!queue) return

    await queue.obliterate({ force: true })
    await queue.close()
    queue = undefined
  })

  it('creates only one Redis job when the same event is enqueued twice', async () => {
    queue = createAffiliateProductionImportQueue(`affiliate-product-import-test-${randomUUID()}`)
    await queue.waitUntilReady()
    await queue.obliterate({ force: true })
    const jobQueue = new BullMqAffiliateProductImportJobQueue(queue)
    const eventId = `evt-${randomUUID()}`

    await jobQueue.enqueue(eventId)
    await jobQueue.enqueue(eventId)

    const job = await queue.getJob(eventId)

    expect(job?.data).toEqual({ eventId })
    expect(job?.name).toBe('affiliate-product-import')
    expect(await queue.getWaitingCount()).toBe(1)
  })
})
