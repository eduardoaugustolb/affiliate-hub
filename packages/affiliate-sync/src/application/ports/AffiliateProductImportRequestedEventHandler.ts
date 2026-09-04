import type { OutboxEventForDelivery } from './OutboxEventDeliveryRepository'

export type AffiliateProductImportRequestedEventHandler = (
  event: OutboxEventForDelivery,
) => Promise<void>
