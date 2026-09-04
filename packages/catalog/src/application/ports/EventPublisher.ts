export interface DomainEvent {
  readonly name: string
  readonly occurredAt: Date
}

export class ProductActivated implements DomainEvent {
  readonly name = 'ProductActivated'

  constructor(
    readonly productId: string,
    readonly occurredAt: Date,
  ) {}
}

export class ProductDeactivated implements DomainEvent {
  readonly name = 'ProductDeactivated'

  constructor(
    readonly productId: string,
    readonly occurredAt: Date,
  ) {}
}

export interface EventPublisher {
  publish(event: DomainEvent): Promise<void>
}
