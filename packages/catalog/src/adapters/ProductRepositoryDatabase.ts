import type { DatabaseConnection } from '@affiliate-hub/shared-kernel'
import { Product, type ProductSnapshot } from '../domain/Product'
import type { ProductStatus } from '../domain/ProductStatus'
import type { ProductRepository } from '../application/ports/ProductRepository'

interface ProductRow {
  id: string
  name: string
  category: string
  status: string
  media_type: string | null
  assigned_template: string | null
  photos: string
  affiliate_link_url: string | null
  created_at: Date
  updated_at: Date
  removed_at: Date | null
}

export class ProductRepositoryDatabase implements ProductRepository {
  constructor(private readonly db: DatabaseConnection) {}

  async save(product: Product): Promise<void> {
    const snapshot = product.toSnapshot()
    await this.db.query(
      `insert into products (
         id, name, category, status, media_type, assigned_template,
         photos, affiliate_link_url, created_at, updated_at, removed_at
       ) values ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
       on conflict (id) do update set
         name = excluded.name,
         status = excluded.status,
         media_type = excluded.media_type,
         assigned_template = excluded.assigned_template,
         photos = excluded.photos,
         affiliate_link_url = excluded.affiliate_link_url,
         updated_at = excluded.updated_at,
         removed_at = excluded.removed_at`,
      [
        snapshot.id,
        snapshot.name,
        snapshot.category,
        snapshot.status,
        snapshot.mediaType,
        snapshot.assignedTemplate,
        JSON.stringify(snapshot.photos),
        snapshot.affiliateLinkUrl,
        snapshot.createdAt,
        snapshot.updatedAt,
        snapshot.removedAt,
      ],
    )
  }

  async findById(id: string): Promise<Product | null> {
    const rows = await this.db.query<ProductRow>('select * from products where id = $1', [id])
    const row = rows[0]
    return row ? Product.rehydrate(toSnapshot(row)) : null
  }

  async listByStatus(status: ProductStatus): Promise<Product[]> {
    const rows = await this.db.query<ProductRow>(
      'select * from products where status = $1 and removed_at is null',
      [status],
    )
    return rows.map((row) => Product.rehydrate(toSnapshot(row)))
  }
}

function toSnapshot(row: ProductRow): ProductSnapshot {
  return {
    id: row.id,
    name: row.name,
    category: row.category as ProductSnapshot['category'],
    status: row.status as ProductSnapshot['status'],
    mediaType: row.media_type as ProductSnapshot['mediaType'],
    assignedTemplate: row.assigned_template,
    photos: JSON.parse(row.photos),
    affiliateLinkUrl: row.affiliate_link_url,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    removedAt: row.removed_at,
  }
}
