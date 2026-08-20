export interface OutboxEventDeliveryRepository {
  findByEventId(eventId: string): Promise<OutboxEventForDelivery | null>
  findPendingEnqueues(limit: number): Promise<PendingOutboxEnqueue[]>
  markAsEnqueued(eventId: string): Promise<void>
  registerEnqueueFailure(eventId: string, message: string): Promise<void>
  markAsProcessed(eventId: string): Promise<void>
}

export interface PendingOutboxEnqueue {
  eventId: string
}

export interface OutboxEventForDelivery {
  eventId: string
  name: string
  payload: unknown
  processedAt: string | null
}
