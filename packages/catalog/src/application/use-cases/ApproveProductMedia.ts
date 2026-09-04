import { type Clock, NotFoundError, type UseCase } from '@affiliate-hub/shared-kernel'
import type { ProductStatus } from '../../domain/ProductStatus'
import type { CatalogUnitOfWork } from '../ports/CatalogUnitOfWork'
import { ProductActivated } from '../ports/EventPublisher'

export interface ApproveProductMediaInput {
  productId: string
  photoUrl: string
  templateId?: string
  tryActivate?: boolean
}

export interface ApproveProductMediaOutput {
  productId: string
  status: ProductStatus
}

export class ApproveProductMedia
  implements UseCase<ApproveProductMediaInput, ApproveProductMediaOutput>
{
  constructor(
    private readonly unitOfWork: CatalogUnitOfWork,
    private readonly clock: Clock,
  ) {}

  async execute(input: ApproveProductMediaInput): Promise<ApproveProductMediaOutput> {
    return await this.unitOfWork.transaction(async ({ products, events }) => {
      const product = await products.findById(input.productId)
      if (!product) {
        throw new NotFoundError(`Product ${input.productId} not found`)
      }

      const wasActive = product.getStatus() === 'active'
      const now = this.clock.now()
      product.approvePhoto(input.photoUrl, now)
      if (input.templateId) {
        product.assignTemplate(input.templateId, now)
      }
      if (input.tryActivate) {
        product.activate(now)
      }

      await products.save(product)

      if (!wasActive && product.getStatus() === 'active') {
        await events.publish(new ProductActivated(product.getId(), now))
      }

      return { productId: product.getId(), status: product.getStatus() }
    })
  }
}
