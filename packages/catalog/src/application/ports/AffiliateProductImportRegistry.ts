export interface AffiliateProductImportRegistry {
  findProductId(provider: string, externalProductId: string): Promise<string | null>
  save(provider: string, externalProductId: string, productId: string): Promise<void>
}
