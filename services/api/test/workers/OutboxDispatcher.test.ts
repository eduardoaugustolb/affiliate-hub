import { describe, expect, it } from 'bun:test'
import type { DatabaseConnection } from '@affiliate-hub/shared-kernel'
import { OutboxDispatcher } from '../../src/workers/OutboxDispatcher'

interface StoredEvent {
  id: number
  eventId: string
  name: string
  payload: unknown
  attempts: number
  processedAt: Date | null
  availableAt: Date
  lockedUntil: Date | null
  lockToken: string | null
  lastError: string | null
}

class OutboxDatabaseFake implements DatabaseConnection {
  readonly event: StoredEvent = {
    id: 1,
    eventId: 'event-1',
    name: 'AffiliateProductImportRequested',
    payload: { externalProductId: 'shopee-1' },
    attempts: 0,
    processedAt: null,
    availableAt: new Date(0),
    lockedUntil: null,
    lockToken: null,
    lastError: null,
  }

  async query<Row = unknown>(sql: string, params: unknown[] = []): Promise<Row[]> {
    if (sql.includes('for update skip locked')) {
      if (this.event.processedAt || this.event.availableAt > new Date() || this.event.lockedUntil)
        return []

      this.event.lockedUntil = new Date(Date.now() + 5 * 60_000)
      this.event.lockToken = String(params[0])
      this.event.attempts += 1
      return [
        {
          id: this.event.id,
          event_id: this.event.eventId,
          name: this.event.name,
          payload: this.event.payload,
          lock_token: this.event.lockToken,
        } as Row,
      ]
    }

    if (sql.includes('set processed_at = now()')) {
      if (this.event.lockToken === params[1]) {
        this.event.processedAt = new Date()
        this.event.lockedUntil = null
        this.event.lockToken = null
      }
      return []
    }

    if (sql.includes('last_error = $3')) {
      if (this.event.lockToken === params[1]) {
        this.event.lockedUntil = null
        this.event.lockToken = null
        this.event.lastError = String(params[2])
        const retryInMilliseconds =
          this.event.attempts === 1
            ? 60_000
            : this.event.attempts === 2
              ? 5 * 60_000
              : this.event.attempts === 3
                ? 15 * 60_000
                : 60 * 60_000
        this.event.availableAt = new Date(Date.now() + retryInMilliseconds)
      }
      return []
    }

    throw new Error(`Unexpected query: ${sql}`)
  }

  async transaction<Result>(
    callback: (connection: DatabaseConnection) => Promise<Result>,
  ): Promise<Result> {
    return callback(this)
  }
}

describe('OutboxDispatcher', () => {
  it('marks a successfully handled event as processed and releases its lock', async () => {
    const db = new OutboxDatabaseFake()
    const dispatcher = new OutboxDispatcher(db, {
      AffiliateProductImportRequested: async () => undefined,
    })

    expect(await dispatcher.dispatchOne()).toBe(true)
    expect(db.event.processedAt).not.toBeNull()
    expect(db.event.lockedUntil).toBeNull()
    expect(db.event.attempts).toBe(1)
  })

  it('keeps a failed event pending, records the error, and schedules a retry', async () => {
    const db = new OutboxDatabaseFake()
    const beforeDispatch = new Date()
    const dispatcher = new OutboxDispatcher(db, {
      AffiliateProductImportRequested: async () => {
        throw new Error('Catalog is unavailable')
      },
    })

    expect(await dispatcher.dispatchOne()).toBe(true)
    expect(db.event.processedAt).toBeNull()
    expect(db.event.lockedUntil).toBeNull()
    expect(db.event.lastError).toBe('Catalog is unavailable')
    expect(db.event.availableAt.getTime()).toBeGreaterThanOrEqual(beforeDispatch.getTime() + 60_000)
    expect(db.event.attempts).toBe(1)
  })

  it('retries an event with no registered handler instead of marking it as processed', async () => {
    const db = new OutboxDatabaseFake()
    const dispatcher = new OutboxDispatcher(db, {})

    expect(await dispatcher.dispatchOne()).toBe(true)
    expect(db.event.processedAt).toBeNull()
    expect(db.event.lockedUntil).toBeNull()
    expect(db.event.lastError).toBe('No handler registered for AffiliateProductImportRequested')
  })

  it('increases the retry delay after repeated failures', async () => {
    const db = new OutboxDatabaseFake()
    db.event.attempts = 1
    const beforeDispatch = new Date()
    const dispatcher = new OutboxDispatcher(db, {
      AffiliateProductImportRequested: async () => {
        throw new Error('Still unavailable')
      },
    })

    await dispatcher.dispatchOne()

    expect(db.event.attempts).toBe(2)
    expect(db.event.availableAt.getTime()).toBeGreaterThanOrEqual(
      beforeDispatch.getTime() + 5 * 60_000,
    )
  })

  it('claims an event once when two dispatchers compete for it', async () => {
    const db = new OutboxDatabaseFake()
    let handled = 0
    const handlers = {
      AffiliateProductImportRequested: async () => {
        handled += 1
      },
    }
    const first = new OutboxDispatcher(db, handlers)
    const second = new OutboxDispatcher(db, handlers)

    const results = await Promise.all([first.dispatchOne(), second.dispatchOne()])

    expect(results.filter(Boolean)).toHaveLength(1)
    expect(handled).toBe(1)
    expect(db.event.attempts).toBe(1)
  })

  it('does not let a stale dispatcher mark a newer lease as processed', async () => {
    const db = new OutboxDatabaseFake()
    const dispatcher = new OutboxDispatcher(db, {
      AffiliateProductImportRequested: async () => {
        db.event.lockToken = 'newer-lease'
        db.event.lockedUntil = new Date(Date.now() + 5 * 60_000)
      },
    })

    expect(await dispatcher.dispatchOne()).toBe(true)
    expect(db.event.processedAt).toBeNull()
    expect(db.event.lockToken).toBe('newer-lease')
  })
})
