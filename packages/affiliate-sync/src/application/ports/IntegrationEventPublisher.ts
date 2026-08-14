import type { AffiliateProductImportRequested } from '@affiliate-hub/contracts'

export interface IntegrationEventPublisher {
  publish(event: AffiliateProductImportRequested): Promise<void>
}
