export interface AffiliateProductImportJobQueue {
  enqueue(eventId: string): Promise<void>
}
