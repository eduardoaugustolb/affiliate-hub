export { Product } from './domain/Product'
export type { Category, CreateProductData, MediaType, ProductSnapshot } from './domain/Product'
export { ProductId } from './domain/ProductId'
export { Photo } from './domain/Photo'
export type { ProductStatus } from './domain/ProductStatus'

export type { ProductRepository } from './application/ports/ProductRepository'
export { ProductActivated, ProductDeactivated } from './application/ports/EventPublisher'
export type { DomainEvent, EventPublisher } from './application/ports/EventPublisher'

export { RegisterProduct } from './application/use-cases/RegisterProduct'
export type { RegisterProductInput, RegisterProductOutput } from './application/use-cases/RegisterProduct'
export { ApproveProductMedia } from './application/use-cases/ApproveProductMedia'
export type {
  ApproveProductMediaInput,
  ApproveProductMediaOutput,
} from './application/use-cases/ApproveProductMedia'
export { DeactivateProduct } from './application/use-cases/DeactivateProduct'
export type { DeactivateProductInput, DeactivateProductOutput } from './application/use-cases/DeactivateProduct'
export { ListProductsForCuration } from './application/use-cases/ListProductsForCuration'
export type { ListProductsForCurationOutput } from './application/use-cases/ListProductsForCuration'

export { ProductRepositoryDatabase } from './adapters/ProductRepositoryDatabase'
export { OutboxPublisherDatabase } from './adapters/OutboxPublisherDatabase'
