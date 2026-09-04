import type { DatabaseConnection } from '@affiliate-hub/shared-kernel'
import type {
  CatalogTransactionScope,
  CatalogUnitOfWork,
} from '../application/ports/CatalogUnitOfWork'
import { OutboxPublisherSql } from './OutboxPublisherSql'
import { ProductRepositorySql } from './ProductRepositorySql'

export class CatalogUnitOfWorkSql implements CatalogUnitOfWork {
  constructor(private readonly connection: DatabaseConnection) {}

  async transaction<Result>(
    callback: (scope: CatalogTransactionScope) => Promise<Result>,
  ): Promise<Result> {
    return await this.connection.transaction(async (tx) => {
      const scope: CatalogTransactionScope = {
        products: new ProductRepositorySql(tx),
        events: new OutboxPublisherSql(tx),
      }
      return await callback(scope)
    })
  }
}
