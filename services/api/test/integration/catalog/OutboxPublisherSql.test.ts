import { afterEach, describe, expect, it } from 'bun:test'
import { OutboxPublisherSql } from '@affiliate-hub/catalog'
import { PgAdapter } from '../../../src/adapters/database/PgAdapter'

const DATABASE_URL =
  process.env.DATABASE_URL ?? 'postgres://postgres:postgres@localhost:5433/drops_do_frost'

describe('OutboxPublisherSql (integration)', () => {
  const db = new PgAdapter(DATABASE_URL)
  const eventPublisher = new OutboxPublisherSql(db)

  afterEach(async () => {
    await db.query("delete from outbox_events where payload::text like '%INTEGRATION-TEST%'")
  })

  it('persists a domain event as a row in outbox_events', async () => {
    await eventPublisher.publish({
      name: 'ProductActivated',
      occurredAt: new Date(),
      productId: 'INTEGRATION-TEST-001',
    } as never)

    const rows = await db.query<{ name: string; payload: string }>(
      "select name, payload from outbox_events where payload::text like '%INTEGRATION-TEST%' order by id desc limit 1",
    )

    expect(rows[0]?.name).toBe('ProductActivated')
    expect(JSON.parse(rows[0]?.payload ?? '{}').productId).toBe('INTEGRATION-TEST-001')
  })
})
