import type { DatabaseConnection } from '@affiliate-hub/shared-kernel'
import type { AffiliateProductImportRegistry } from '../application/ports/AffiliateProductImportRegistry'

export class AffiliateProductImportRegistrySql implements AffiliateProductImportRegistry {
  constructor(private readonly db: DatabaseConnection) {}

  async findProductId(provider: string, externalProductId: string): Promise<string | null> {
    const rows = await this.db.query<{ product_id: string }>(
      'select product_id from affiliate_product_imports where provider = $1 and external_product_id = $2',
      [provider, externalProductId],
    )
    return rows[0]?.product_id ?? null
  }

  async save(provider: string, externalProductId: string, productId: string): Promise<void> {
    await this.db.query(
      'insert into affiliate_product_imports (provider, external_product_id, product_id, imported_at) values ($1, $2, $3, now())',
      [provider, externalProductId, productId],
    )
  }
}
