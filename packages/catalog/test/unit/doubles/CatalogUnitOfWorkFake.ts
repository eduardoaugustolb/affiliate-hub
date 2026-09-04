import type {
  CatalogTransactionScope,
  CatalogUnitOfWork,
} from '../../../src/application/ports/CatalogUnitOfWork'
import type { EventPublisher } from '../../../src/application/ports/EventPublisher'
import type { ProductRepository } from '../../../src/application/ports/ProductRepository'
import type { ProductSnapshot } from '../../../src/domain/Product'

type SnapshotRepository = ProductRepository & {
  snapshots(): ReadonlyArray<ProductSnapshot>
  restore(snapshots: ReadonlyArray<ProductSnapshot>): void
}
type PublishedEvents = EventPublisher & { published: unknown[] }

export class CatalogUnitOfWorkFake implements CatalogUnitOfWork {
  transactions = 0

  constructor(
    private readonly products: ProductRepository,
    private readonly events: EventPublisher,
  ) {}

  async transaction<Result>(
    callback: (scope: CatalogTransactionScope) => Promise<Result>,
  ): Promise<Result> {
    this.transactions += 1
    const repository = this.products as SnapshotRepository
    const eventPublisher = this.events as PublishedEvents
    const snapshots = repository.snapshots?.()
    const eventCount = eventPublisher.published?.length ?? 0

    try {
      return await callback({ products: this.products, events: this.events })
    } catch (error) {
      if (snapshots) repository.restore(snapshots)
      if (eventPublisher.published) eventPublisher.published.length = eventCount
      throw error
    }
  }
}
