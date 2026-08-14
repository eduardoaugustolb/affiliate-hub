import type { DatabaseConnection } from '@affiliate-hub/shared-kernel'
import type { AffiliateProductImportRegistry } from '../../workers/handlers/handleAffiliateProductImportRequested'

export class AffiliateProductImportRegistrySql implements AffiliateProductImportRegistry {
  constructor(private readonly db: DatabaseConnection) {}

  async findProductId(externalProductId: string): Promise<string | null> {
    const rows = await this.db.query<{ product_id: string }>(
      'select product_id from affiliate_product_imports where external_product_id = $1',
      [externalProductId],
    )
    return rows[0]?.product_id ?? null
  }

  async save(externalProductId: string, productId: string): Promise<void> {
    await this.db.query(
      'insert into affiliate_product_imports (external_product_id, product_id, imported_at) values ($1, $2, now())',
      [externalProductId, productId],
    )
  }
}
