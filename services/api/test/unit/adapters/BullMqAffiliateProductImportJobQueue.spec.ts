import { describe, expect, it } from 'bun:test'
import type { Queue } from 'bullmq'
import { BullMqAffiliateProductImportJobQueue } from '../../../src/infrastructure/queue/bullmq/BullMqAffiliateProductImportJobQueue'

interface AddedJob {
  name: string
  data: unknown
  options: unknown
}

function queueThatRecordsJobs(addedJobs: AddedJob[]): Queue {
  return {
    add: async (name: string, data: unknown, options: unknown) => {
      addedJobs.push({ name, data, options })
    },
  } as unknown as Queue
}

describe('BullMqAffiliateProductImportJobQueue', () => {
  it('adds a job whose payload contains only the event id and uses the configured retry policy', async () => {
    const addedJobs: AddedJob[] = []
    const jobQueue = new BullMqAffiliateProductImportJobQueue(queueThatRecordsJobs(addedJobs))

    await jobQueue.enqueue('evt-123')

    expect(addedJobs).toEqual([
      {
        name: 'affiliate-product-import',
        data: { eventId: 'evt-123' },
        options: {
          attempts: 5,
          jobId: 'evt-123',
          backoff: {
            type: 'exponential',
            delay: 60_000,
          },
        },
      },
    ])
  })

  it('uses the same deterministic job id when the same event is enqueued again', async () => {
    const addedJobs: AddedJob[] = []
    const jobQueue = new BullMqAffiliateProductImportJobQueue(queueThatRecordsJobs(addedJobs))

    await jobQueue.enqueue('evt-123')
    await jobQueue.enqueue('evt-123')

    expect(addedJobs).toHaveLength(2)
    expect(addedJobs[0]?.options).toMatchObject({ jobId: 'evt-123' })
    expect(addedJobs[1]?.options).toMatchObject({ jobId: 'evt-123' })
  })

  it('propagates the failure returned by BullMQ', async () => {
    const redisError = new Error('Redis is unavailable')
    const queue = {
      add: async () => Promise.reject(redisError),
    } as unknown as Queue
    const jobQueue = new BullMqAffiliateProductImportJobQueue(queue)

    await expect(jobQueue.enqueue('evt-123')).rejects.toThrow('Redis is unavailable')
  })
})
