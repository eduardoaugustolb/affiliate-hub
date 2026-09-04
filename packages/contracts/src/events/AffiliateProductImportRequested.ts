export interface AffiliateProductImportRequested {
  id: string
  name: 'AffiliateProductImportRequested'
  occurredAt: string
  payload: {
    externalProductId: string
    name: string
    provider: string
    category: 'streetwear' | 'perfume'
  }
}

export const AffiliateProviderName = 'shopee'
