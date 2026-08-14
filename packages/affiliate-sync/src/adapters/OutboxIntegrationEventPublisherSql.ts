import type { AffiliateProductImportRequested } from '@affiliate-hub/contracts'
import type { DatabaseConnection } from '@affiliate-hub/shared-kernel'
import type { IntegrationEventPublisher } from '../application/ports/IntegrationEventPublisher'

export class OutboxIntegrationEventPublisherSql implements IntegrationEventPublisher {
  constructor(private readonly db: DatabaseConnection) {}

  async publish(event: AffiliateProductImportRequested): Promise<void> {
    await this.db.query(
      'insert into outbox_events (event_id, name, payload, occurred_at, available_at) values ($1, $2, $3, $4, $5)',
      [event.id, event.name, JSON.stringify(event.payload), event.occurredAt, event.occurredAt],
    )
  }
}
