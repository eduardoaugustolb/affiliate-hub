import { describe, expect, it } from 'bun:test'
import type { DatabaseConnection } from '@affiliate-hub/shared-kernel'
import { CatalogUnitOfWorkSql } from '../src/adapters/CatalogUnitOfWorkSql'
import { ProductActivated } from '../src/application/ports/EventPublisher'
import { Product } from '../src/domain/Product'

class TransactionalDatabaseFake implements DatabaseConnection {
  readonly committedQueries: string[] = []
  readonly rolledBackQueries: string[] = []
  private readonly failOnOutbox: boolean

  constructor(failOnOutbox = false) {
    this.failOnOutbox = failOnOutbox
  }

  async query<Row = unknown>(sql: string, _params?: unknown[]): Promise<Row[]> {
    if (this.failOnOutbox && sql.includes('outbox_events')) {
      throw new Error('outbox unavailable')
    }
    return []
  }

  async transaction<Result>(
    callbackOrOptions:
      | ((connection: DatabaseConnection) => Promise<Result>)
      | { isolationLevel?: 'serializable'; maxRetries?: number },
    maybeCallback?: (connection: DatabaseConnection) => Promise<Result>,
  ): Promise<Result> {
    const callback = typeof callbackOrOptions === 'function' ? callbackOrOptions : maybeCallback
    if (!callback) throw new Error('Transaction callback is required')

    const queries: string[] = []
    const transactionConnection: DatabaseConnection = {
      query: async <Row = unknown>(sql: string, params?: unknown[]) => {
        queries.push(sql)
        return await this.query<Row>(sql, params)
      },
      transaction: callbackOrOptions as never,
    }

    try {
      const result = await callback(transactionConnection)
      this.committedQueries.push(...queries)
      return result
    } catch (error) {
      this.rolledBackQueries.push(...queries)
      throw error
    }
  }
}

describe('CatalogUnitOfWorkSql', () => {
  it('commits product and outbox writes together on the transaction connection', async () => {
    const db = new TransactionalDatabaseFake()
    const unitOfWork = new CatalogUnitOfWorkSql(db)
    const product = Product.createDraft('PRODUCT-1', { name: 'Perfume X', category: 'perfume' })

    await unitOfWork.transaction(async ({ products, events }) => {
      await products.save(product)
      await events.publish(new ProductActivated(product.getId()))
    })

    expect(db.committedQueries).toHaveLength(2)
    expect(db.committedQueries[0]).toContain('products')
    expect(db.committedQueries[1]).toContain('outbox_events')
    expect(db.rolledBackQueries).toHaveLength(0)
  })

  it('does not commit the product when the outbox write fails', async () => {
    const db = new TransactionalDatabaseFake(true)
    const unitOfWork = new CatalogUnitOfWorkSql(db)
    const product = Product.createDraft('PRODUCT-2', { name: 'Perfume Y', category: 'perfume' })

    await expect(
      unitOfWork.transaction(async ({ products, events }) => {
        await products.save(product)
        await events.publish(new ProductActivated(product.getId()))
      }),
    ).rejects.toThrow('outbox unavailable')

    expect(db.committedQueries).toHaveLength(0)
    expect(db.rolledBackQueries).toHaveLength(2)
  })
})
