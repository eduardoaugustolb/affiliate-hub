import { describe, expect, it } from 'bun:test'
import type { DatabaseConnection, IdGenerator } from '@affiliate-hub/shared-kernel'
import { handleAffiliateProductImportRequested } from '../../../src/infrastructure/event-handlers/handleAffiliateProductImportRequested'

class IdGeneratorFake implements IdGenerator {
  generate(): string {
    return 'product-1'
  }
}

class DatabaseConnectionFake implements DatabaseConnection {
  readonly products: string[] = []
  readonly mappings = new Map<string, string>()
  failOnMappingInsert = false

  async query<Row = unknown>(sql: string, params: unknown[] = []): Promise<Row[]> {
    if (sql.startsWith('select product_id from affiliate_product_imports')) {
      const productId = this.mappings.get(mappingKey(params[0] as string, params[1] as string))
      return (productId ? [{ product_id: productId }] : []) as Row[]
    }
    if (sql.startsWith('insert into products')) {
      this.products.push(params[0] as string)
      return []
    }
    if (sql.startsWith('insert into affiliate_product_imports')) {
      if (this.failOnMappingInsert) throw new Error('registry unavailable')
      this.mappings.set(mappingKey(params[0] as string, params[1] as string), params[2] as string)
      return []
    }
    throw new Error(`Unexpected query: ${sql}`)
  }

  async transaction<Result>(
    callback: (connection: DatabaseConnection) => Promise<Result>,
  ): Promise<Result> {
    const transactional = new DatabaseConnectionFake()
    transactional.products.push(...this.products)
    for (const [externalProductId, productId] of this.mappings) {
      transactional.mappings.set(externalProductId, productId)
    }
    transactional.failOnMappingInsert = this.failOnMappingInsert

    const result = await callback(transactional)
    this.products.splice(0, this.products.length, ...transactional.products)
    this.mappings.clear()
    for (const [externalProductId, productId] of transactional.mappings) {
      this.mappings.set(externalProductId, productId)
    }
    return result
  }
}

const event = {
  id: 1,
  eventId: 'event-1',
  name: 'AffiliateProductImportRequested',
  payload: {
    externalProductId: 'shopee-1',
    name: 'Moletom',
    provider: 'shopee',
    category: 'streetwear',
  },
  lockToken: 'lock-1',
} as const

describe('handleAffiliateProductImportRequested', () => {
  it('registers a product and saves the external-product mapping in one transaction', async () => {
    const db = new DatabaseConnectionFake()
    const handler = handleAffiliateProductImportRequested(db, new IdGeneratorFake())

    await handler(event)

    expect(db.products).toEqual(['product-1'])
    expect(db.mappings.get(mappingKey('shopee', 'shopee-1'))).toBe('product-1')
  })

  it('does not register an already imported product', async () => {
    const db = new DatabaseConnectionFake()
    db.mappings.set(mappingKey('shopee', 'shopee-1'), 'existing-product')
    const handler = handleAffiliateProductImportRequested(db, new IdGeneratorFake())

    await handler(event)

    expect(db.products).toEqual([])
  })

  it('rolls back product creation when saving the mapping fails', async () => {
    const db = new DatabaseConnectionFake()
    db.failOnMappingInsert = true
    const handler = handleAffiliateProductImportRequested(db, new IdGeneratorFake())

    await expect(handler(event)).rejects.toThrow('registry unavailable')
    expect(db.products).toEqual([])
    expect(db.mappings.size).toBe(0)
  })
})

function mappingKey(provider: string, externalProductId: string): string {
  return `${provider}:${externalProductId}`
}
