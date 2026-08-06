import type { DomainEvent, EventPublisher } from '../../src/application/ports/EventPublisher'

export class EventPublisherFake implements EventPublisher {
  readonly published: DomainEvent[] = []

  async publish(event: DomainEvent): Promise<void> {
    this.published.push(event)
  }
}
