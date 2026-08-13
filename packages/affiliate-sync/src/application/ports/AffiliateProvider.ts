import type { AffiliateLink } from '../../domain/AffiliateLink'

export interface AffiliateProduct {
  externalProductId: string
  name: string
  category: 'streetwear' | 'perfume'
  affiliateLink: AffiliateLink
}

export interface AffiliateProvider {
  findLink(externalProductId: string): Promise<AffiliateLink | undefined>
  listUpdatedProducts(): Promise<AffiliateProduct[]>
}
