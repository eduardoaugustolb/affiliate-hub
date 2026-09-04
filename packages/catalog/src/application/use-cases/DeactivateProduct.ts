import { NotFoundError, type UseCase } from '@affiliate-hub/shared-kernel'
import type { CatalogUnitOfWork } from '../ports/CatalogUnitOfWork'
import { ProductDeactivated } from '../ports/EventPublisher'

export interface DeactivateProductInput {
  productId: string
}

export interface DeactivateProductOutput {
  productId: string
}

export class DeactivateProduct implements UseCase<DeactivateProductInput, DeactivateProductOutput> {
  constructor(private readonly unitOfWork: CatalogUnitOfWork) {}

  async execute(input: DeactivateProductInput): Promise<DeactivateProductOutput> {
    return await this.unitOfWork.transaction(async ({ products, events }) => {
      const product = await products.findById(input.productId)
      if (!product) {
        throw new NotFoundError(`Product ${input.productId} not found`)
      }

      if (product.getStatus() === 'inactive') {
        return { productId: product.getId() }
      }

      product.deactivate()
      await products.save(product)
      await events.publish(new ProductDeactivated(product.getId()))

      return { productId: product.getId() }
    })
  }
}
