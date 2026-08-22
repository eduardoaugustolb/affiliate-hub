/**
 * Produces the affiliate URL that Catalog will expose through its redirect.
 * Catalog owns this port because the manual product-registration use case
 * needs a link, but it does not know which affiliate provider creates it.
 */
export interface AffiliateLinkGenerator {
  generateAffiliateLink(productUrl: string): Promise<string>
}
