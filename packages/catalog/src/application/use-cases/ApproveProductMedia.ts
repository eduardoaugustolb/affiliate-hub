import { NotFoundError, type UseCase } from '@affiliate-hub/shared-kernel'
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
  constructor(private readonly unitOfWork: CatalogUnitOfWork) {}

  async execute(input: ApproveProductMediaInput): Promise<ApproveProductMediaOutput> {
    return await this.unitOfWork.transaction(async ({ products, events }) => {
      const product = await products.findById(input.productId)
      if (!product) {
        throw new NotFoundError(`Product ${input.productId} not found`)
      }

      const wasActive = product.getStatus() === 'active'
      product.approvePhoto(input.photoUrl)
      if (input.templateId) {
        product.assignTemplate(input.templateId)
      }
      if (input.tryActivate) {
        product.activate()
      }

      await products.save(product)

      if (!wasActive && product.getStatus() === 'active') {
        await events.publish(new ProductActivated(product.getId()))
      }

      return { productId: product.getId(), status: product.getStatus() }
    })
  }
}
