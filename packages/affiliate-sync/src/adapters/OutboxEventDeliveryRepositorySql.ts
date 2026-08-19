import type { DatabaseConnection } from '@affiliate-hub/shared-kernel'
import type {
  OutboxEventDeliveryRepository,
  OutboxEventForDelivery,
} from '../application/ports/OutboxEventDeliveryRepository'

interface OutboxEventRow {
  event_id: string
  name: string
  payload: unknown
  processed_at: Date | null
}

export class OutboxEventDeliveryRepositorySql implements OutboxEventDeliveryRepository {
  constructor(private readonly db: DatabaseConnection) {}

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
