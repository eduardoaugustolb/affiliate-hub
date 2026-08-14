export interface AffiliateProductImportRequested {
  id: string
  name: 'AffiliateProductImportRequested'
  occurredAt: string
  payload: {
    externalProductId: string
    name: string
    category: 'streetwear' | 'perfume'
  }
}
