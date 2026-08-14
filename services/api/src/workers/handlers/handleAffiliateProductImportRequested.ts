import { ProductRepositorySql, RegisterProduct } from '@affiliate-hub/catalog'
import type { AffiliateProductImportRequested } from '@affiliate-hub/contracts'
import type { DatabaseConnection, IdGenerator } from '@affiliate-hub/shared-kernel'
import { AffiliateProductImportRegistrySql } from '../../adapters/database/AffiliateProductImportRegistrySql'
import type { OutboxEventHandler } from '../OutboxDispatcher'

export interface AffiliateProductImportRegistry {
  findProductId(externalProductId: string): Promise<string | null>
  save(externalProductId: string, productId: string): Promise<void>
}

export function handleAffiliateProductImportRequested(
  db: DatabaseConnection,
  idGenerator: IdGenerator,
): OutboxEventHandler {
  return async (event) => {
    const payload = event.payload as AffiliateProductImportRequested['payload']
    if (!payload.externalProductId || !payload.name || !payload.category) {
      throw new Error(`Invalid AffiliateProductImportRequested event ${event.eventId}`)
    }
    const registry = new AffiliateProductImportRegistrySql(db)
    if (await registry.findProductId(payload.externalProductId)) return

    try {
      await db.transaction(async (transaction) => {
        const transactionalRegistry = new AffiliateProductImportRegistrySql(transaction)
        if (await transactionalRegistry.findProductId(payload.externalProductId)) return

        const registerProduct = new RegisterProduct(
          new ProductRepositorySql(transaction),
          idGenerator,
        )
        const product = await registerProduct.execute({
          name: payload.name,
          category: payload.category,
        })
        await transactionalRegistry.save(payload.externalProductId, product.productId)
      })
    } catch (error) {
      if (isUniqueViolation(error) && (await registry.findProductId(payload.externalProductId)))
        return
      throw error
    }
  }
}

function isUniqueViolation(error: unknown): boolean {
  return typeof error === 'object' && error !== null && 'code' in error && error.code === '23505'
}
