import type { DatabaseConnection } from '@affiliate-hub/shared-kernel'
import type { DomainEvent, EventPublisher } from '../application/ports/EventPublisher'

export class OutboxPublisherSql implements EventPublisher {
  constructor(private readonly db: DatabaseConnection) {}

  async publish(event: DomainEvent): Promise<void> {
    await this.db.query(
      'insert into outbox_events (name, payload, occurred_at) values ($1, $2, $3)',
      [event.name, JSON.stringify(event), event.occurredAt],
    )
  }
}
