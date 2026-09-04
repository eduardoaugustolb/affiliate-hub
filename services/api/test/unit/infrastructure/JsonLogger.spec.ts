import { describe, expect, it, spyOn } from 'bun:test'
import { JsonLogger } from '../../../src/infrastructure/observability/JsonLogger'

const clock = { now: () => new Date('2026-08-20T12:00:00.000Z') }

describe('JsonLogger', () => {
  it('emits one JSON line with inherited fields', () => {
    const info = spyOn(console, 'info').mockImplementation(() => {})

    try {
      new JsonLogger(clock, { service: 'worker' })
        .child({ queueName: 'affiliate-product-import' })
        .info('affiliate_import.job.completed', { eventId: 'event-1', durationMs: 12 })

      expect(info).toHaveBeenCalledTimes(1)
      expect(JSON.parse(String(info.mock.calls[0]?.[0]))).toMatchObject({
        level: 'info',
        event: 'affiliate_import.job.completed',
        service: 'worker',
        queueName: 'affiliate-product-import',
        eventId: 'event-1',
        durationMs: 12,
      })
    } finally {
      info.mockRestore()
    }
  })

  it('serializes Error details in an error log', () => {
    const error = spyOn(console, 'error').mockImplementation(() => {})
    const failure = new Error('Redis is unavailable')

    try {
      new JsonLogger(clock).error('affiliate_import.job.failed', failure, { eventId: 'event-1' })

      expect(JSON.parse(String(error.mock.calls[0]?.[0]))).toMatchObject({
        level: 'error',
        event: 'affiliate_import.job.failed',
        eventId: 'event-1',
        error: {
          name: 'Error',
          message: 'Redis is unavailable',
          stack: expect.any(String),
        },
      })
    } finally {
      error.mockRestore()
    }
  })
})
