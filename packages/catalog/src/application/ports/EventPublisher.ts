export interface DomainEvent {
  readonly name: string
  readonly occurredAt: Date
}

export class ProductActivated implements DomainEvent {
  readonly name = 'ProductActivated'
  readonly occurredAt = new Date()

  constructor(readonly productId: string) {}
}

export class ProductDeactivated implements DomainEvent {
  readonly name = 'ProductDeactivated'
  readonly occurredAt = new Date()

  constructor(readonly productId: string) {}
}

export interface EventPublisher {
  publish(event: DomainEvent): Promise<void>
}
