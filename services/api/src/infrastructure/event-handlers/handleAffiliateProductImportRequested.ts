import type { OutboxEventForDelivery } from '@affiliate-hub/affiliate-sync'
import {
  AffiliateProductImportRegistrySql,
  ProductRepositorySql,
  RegisterProduct,
} from '@affiliate-hub/catalog'
import type { AffiliateProductImportRequested } from '@affiliate-hub/contracts'
import type { DatabaseConnection, IdGenerator } from '@affiliate-hub/shared-kernel'

type AffiliateProductImportRequestedEvent = Pick<
  OutboxEventForDelivery,
  'eventId' | 'name' | 'payload'
>

export type AffiliateProductImportRequestedHandler = (
  event: AffiliateProductImportRequestedEvent,
) => Promise<void>

export function handleAffiliateProductImportRequested(
  db: DatabaseConnection,
  idGenerator: IdGenerator,
): AffiliateProductImportRequestedHandler {
  return async (event) => {
    const payload = event.payload as AffiliateProductImportRequested['payload']
    if (!payload.externalProductId || !payload.name || !payload.category) {
      throw new Error(`Invalid AffiliateProductImportRequested event ${event.eventId}`)
    }
    const registry = new AffiliateProductImportRegistrySql(db)
    if (await registry.findProductId(payload.provider, payload.externalProductId)) return

    try {
      await db.transaction(async (transaction) => {
        const transactionalRegistry = new AffiliateProductImportRegistrySql(transaction)
        if (await transactionalRegistry.findProductId(payload.provider, payload.externalProductId))
          return

        const registerProduct = new RegisterProduct(
          new ProductRepositorySql(transaction),
          idGenerator,
        )
        const product = await registerProduct.execute({
          name: payload.name,
          category: payload.category,
        })
        await transactionalRegistry.save(
          payload.provider,
          payload.externalProductId,
          product.productId,
        )
      })
    } catch (error) {
      if (
        isUniqueViolation(error) &&
        (await registry.findProductId(payload.provider, payload.externalProductId))
      )
        return
      throw error
    }
  }
}

function isUniqueViolation(error: unknown): boolean {
  if (typeof error !== 'object' || error === null) return false

  if ('code' in error && error.code === '23505') return true

  return (
    error instanceof Error &&
    error.message.includes('duplicate key value violates unique constraint')
  )
}
