import type { AffiliateLink } from '../../domain/AffiliateLink'

export interface AffiliateProduct {
  externalProductId: string
  name: string
  category: 'streetwear' | 'perfume'
  affiliateLink: AffiliateLink
}

export interface AffiliateProvider {
  generateShortLink(originUrl: string): Promise<AffiliateLink>
  listUpdatedProducts(): Promise<AffiliateProduct[]>
}
