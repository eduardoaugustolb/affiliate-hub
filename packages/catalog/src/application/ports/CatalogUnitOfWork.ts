import type { EventPublisher } from './EventPublisher'
import type { ProductRepository } from './ProductRepository'

export interface CatalogTransactionScope {
  products: ProductRepository
  events: EventPublisher
}

export interface CatalogUnitOfWork {
  transaction<Result>(
    callback: (scope: CatalogTransactionScope) => Promise<Result>,
  ): Promise<Result>
}
