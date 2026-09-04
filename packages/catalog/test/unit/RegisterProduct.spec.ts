import { describe, expect, it } from 'bun:test'
import { RegisterProduct } from '../../src/application/use-cases/RegisterProduct'
import { IdGeneratorFake } from './doubles/IdGeneratorFake'
import { ProductRepositoryFake } from './doubles/ProductRepositoryFake'

const clock = { now: () => new Date('2026-08-20T12:00:00.000Z') }

describe('RegisterProduct', () => {
  it('creates a draft product and persists it through the port', async () => {
    const productRepository = new ProductRepositoryFake()
    const useCase = new RegisterProduct(productRepository, new IdGeneratorFake(), clock)

    const output = await useCase.execute({ name: 'Oversized Hoodie', category: 'streetwear' })

    const savedProduct = await productRepository.findById(output.productId)
    expect(savedProduct).not.toBeNull()
    expect(savedProduct?.getStatus()).toBe('draft')
  })
})
