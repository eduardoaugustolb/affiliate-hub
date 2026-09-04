import type { DatabaseConnection } from '@affiliate-hub/shared-kernel'
import type { DomainEvent, EventPublisher } from '../application/ports/EventPublisher'

export class OutboxPublisherSql implements EventPublisher {
  constructor(private readonly db: DatabaseConnection) {}

  async publish(event: DomainEvent): Promise<void> {
    await this.db.query(
      'insert into outbox_events (event_id, name, payload, occurred_at, available_at) values ($1, $2, $3, $4, $5)',
      [crypto.randomUUID(), event.name, JSON.stringify(event), event.occurredAt, event.occurredAt],
    )
  }
}
