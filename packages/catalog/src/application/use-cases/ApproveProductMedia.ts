import { NotFoundError, type UseCase } from '@affiliate-hub/shared-kernel'
import type { ProductStatus } from '../../domain/ProductStatus'
import { ProductActivated } from '../ports/EventPublisher'
import type { EventPublisher } from '../ports/EventPublisher'
import type { ProductRepository } from '../ports/ProductRepository'

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

export class ApproveProductMedia implements UseCase<ApproveProductMediaInput, ApproveProductMediaOutput> {
  constructor(
    private readonly productRepository: ProductRepository,
    private readonly eventPublisher: EventPublisher,
  ) {}

  async execute(input: ApproveProductMediaInput): Promise<ApproveProductMediaOutput> {
    const product = await this.productRepository.findById(input.productId)
    if (!product) {
      throw new NotFoundError(`Product ${input.productId} not found`)
    }

    product.approvePhoto(input.photoUrl)
    if (input.templateId) {
      product.assignTemplate(input.templateId)
    }
    if (input.tryActivate) {
      product.activate()
    }

    await this.productRepository.save(product)

    if (product.getStatus() === 'active') {
      await this.eventPublisher.publish(new ProductActivated(product.getId().toString()))
    }

    return { productId: product.getId().toString(), status: product.getStatus() }
  }
}
