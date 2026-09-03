export type { AffiliateLinkGenerator } from './ports/AffiliateLinkGenerator'
export type { AffiliateProductImportRegistry } from './ports/AffiliateProductImportRegistry'
export type { CatalogTransactionScope, CatalogUnitOfWork } from './ports/CatalogUnitOfWork'
export type { DomainEvent, EventPublisher } from './ports/EventPublisher'
export { ProductActivated, ProductDeactivated } from './ports/EventPublisher'
export type { ProductRepository } from './ports/ProductRepository'
export type {
  ApproveProductMediaInput,
  ApproveProductMediaOutput,
} from './use-cases/ApproveProductMedia'
export { ApproveProductMedia } from './use-cases/ApproveProductMedia'
export type {
  DeactivateProductInput,
  DeactivateProductOutput,
} from './use-cases/DeactivateProduct'
export { DeactivateProduct } from './use-cases/DeactivateProduct'
export type {
  ListProductsForCurationInput,
  ListProductsForCurationOutput,
} from './use-cases/ListProductsForCuration'
export { ListProductsForCuration } from './use-cases/ListProductsForCuration'
export type {
  RegisterManualProductInput,
  RegisterManualProductOutput,
} from './use-cases/RegisterManualProduct'
export { RegisterManualProduct } from './use-cases/RegisterManualProduct'
export type {
  RegisterProductInput,
  RegisterProductOutput,
} from './use-cases/RegisterProduct'
export { RegisterProduct } from './use-cases/RegisterProduct'
