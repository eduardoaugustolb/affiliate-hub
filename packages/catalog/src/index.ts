export { OutboxPublisherSql } from './adapters/OutboxPublisherSql'
export { ProductRepositorySql } from './adapters/ProductRepositorySql'
export type { DomainEvent, EventPublisher } from './application/ports/EventPublisher'
export { ProductActivated, ProductDeactivated } from './application/ports/EventPublisher'
export type { ProductRepository } from './application/ports/ProductRepository'
export type {
  ApproveProductMediaInput,
  ApproveProductMediaOutput,
} from './application/use-cases/ApproveProductMedia'
export { ApproveProductMedia } from './application/use-cases/ApproveProductMedia'
export type {
  DeactivateProductInput,
  DeactivateProductOutput,
} from './application/use-cases/DeactivateProduct'
export { DeactivateProduct } from './application/use-cases/DeactivateProduct'
export type { ListProductsForCurationOutput } from './application/use-cases/ListProductsForCuration'
export { ListProductsForCuration } from './application/use-cases/ListProductsForCuration'
export type {
  RegisterProductInput,
  RegisterProductOutput,
} from './application/use-cases/RegisterProduct'
export { RegisterProduct } from './application/use-cases/RegisterProduct'
export { Photo } from './domain/Photo'
export type { Category, CreateProductData, MediaType, ProductSnapshot } from './domain/Product'
export { Product } from './domain/Product'
export type { ProductStatus } from './domain/ProductStatus'
