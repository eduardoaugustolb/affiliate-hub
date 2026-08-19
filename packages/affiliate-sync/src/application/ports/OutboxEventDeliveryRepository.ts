export interface OutboxEventDeliveryRepository {
  findByEventId(eventId: string): Promise<OutboxEventForDelivery | null>
  markAsProcessed(eventId: string): Promise<void>
}

export interface OutboxEventForDelivery {
  eventId: string
  name: string
  payload: unknown
  processedAt: string | null
}
