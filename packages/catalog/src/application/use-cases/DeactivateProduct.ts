import { NotFoundError, type UseCase } from '@affiliate-hub/shared-kernel'
import { ProductDeactivated } from '../ports/EventPublisher'
import type { EventPublisher } from '../ports/EventPublisher'
import type { ProductRepository } from '../ports/ProductRepository'

export interface DeactivateProductInput {
  productId: string
}

export interface DeactivateProductOutput {
  productId: string
}

export class DeactivateProduct implements UseCase<DeactivateProductInput, DeactivateProductOutput> {
  constructor(
    private readonly productRepository: ProductRepository,
    private readonly eventPublisher: EventPublisher,
  ) {}

  async execute(input: DeactivateProductInput): Promise<DeactivateProductOutput> {
    const product = await this.productRepository.findById(input.productId)
    if (!product) {
      throw new NotFoundError(`Product ${input.productId} not found`)
    }

    product.deactivate()
    await this.productRepository.save(product)
    await this.eventPublisher.publish(new ProductDeactivated(product.getId().toString()))

    return { productId: product.getId().toString() }
  }
}
