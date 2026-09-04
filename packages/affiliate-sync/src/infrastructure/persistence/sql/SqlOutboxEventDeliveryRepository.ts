import type { DatabaseConnection } from '@affiliate-hub/shared-kernel'
import type {
  OutboxEventDeliveryRepository,
  OutboxEventForDelivery,
  PendingOutboxEnqueue,
} from '../../../application/ports/OutboxEventDeliveryRepository'

interface OutboxEventRow {
  event_id: string
  name: string
  payload: unknown
  processed_at: Date | null
}

export class SqlOutboxEventDeliveryRepository implements OutboxEventDeliveryRepository {
  constructor(private readonly db: DatabaseConnection) {}

  async findPendingEnqueues(limit: number): Promise<PendingOutboxEnqueue[]> {
    const rows = await this.db.query<{ event_id: string }>(
      `select event_id
       from outbox_events
       where enqueued_at is null and processed_at is null
       order by occurred_at asc, id asc
       limit $1`,
      [limit],
    )

    return rows.map((row) => ({ eventId: row.event_id }))
  }

  async markAsEnqueued(eventId: string): Promise<void> {
    await this.db.query(
      `update outbox_events
       set enqueued_at = now(), last_enqueue_error = null
       where event_id = $1 and enqueued_at is null`,
      [eventId],
    )
  }

  async registerEnqueueFailure(eventId: string, message: string): Promise<void> {
    await this.db.query(
      `update outbox_events
       set last_enqueue_error = $2,
           enqueue_attempts = enqueue_attempts + 1
       where event_id = $1`,
      [eventId, message],
    )
  }

  async findByEventId(eventId: string): Promise<OutboxEventForDelivery | null> {
    const rows = await this.db.query<OutboxEventRow>(
      'select event_id, name, payload, processed_at from outbox_events where event_id = $1',
      [eventId],
    )
    const row = rows[0]

    if (!row) return null

    return {
      eventId: row.event_id,
      name: row.name,
      payload: typeof row.payload === 'string' ? JSON.parse(row.payload) : row.payload,
      processedAt: row.processed_at?.toISOString() ?? null,
    }
  }

  async markAsProcessed(eventId: string): Promise<void> {
    await this.db.query(
      'update outbox_events set processed_at = now() where event_id = $1 and processed_at is null',
      [eventId],
    )
  }
}
