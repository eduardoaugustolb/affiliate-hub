import { describe, expect, it } from 'bun:test'
import { DomainError } from '@affiliate-hub/shared-kernel'
import { Product } from '../src/domain/Product'

describe('Product', () => {
  it('starts as draft', () => {
    const product = Product.createDraft('PRODUCT-1', {
      name: 'Oversized Hoodie',
      category: 'streetwear',
    })

    expect(product.getStatus()).toBe('draft')
  })

  it('does not activate without an approved photo', () => {
    const product = Product.createDraft('PRODUCT-2', { name: 'Perfume X', category: 'perfume' })
    product.assignAffiliateLink('https://example.com/link')

    expect(() => product.activate()).toThrow(DomainError)
    expect(() => product.activate()).toThrow(/approved photo/)
  })

  it('does not activate without an affiliate link', () => {
    const product = Product.createDraft('PRODUCT-2', { name: 'Perfume X', category: 'perfume' })
    product.addPhoto('https://example.com/photo.jpg')
    product.approvePhoto('https://example.com/photo.jpg')

    expect(() => product.activate()).toThrow(DomainError)
    expect(() => product.activate()).toThrow(/affiliate link/)
  })

  it('activates once it has an approved photo and an affiliate link', () => {
    const product = Product.createDraft('PRODUCT-2', { name: 'Perfume X', category: 'perfume' })
    product.addPhoto('https://example.com/photo.jpg')
    product.approvePhoto('https://example.com/photo.jpg')
    product.assignAffiliateLink('https://example.com/link')

    product.activate()

    expect(product.getStatus()).toBe('active')
  })

  it('deactivates and stamps removedAt (soft delete)', () => {
    const product = Product.createDraft('PRODUCT-2', { name: 'Perfume X', category: 'perfume' })

    product.deactivate()

    expect(product.getStatus()).toBe('inactive')
    expect(product.toSnapshot().removedAt).not.toBeNull()
  })

  it('a removed product cannot be changed', () => {
    const product = Product.createDraft('PRODUCT-2', { name: 'Perfume X', category: 'perfume' })
    product.deactivate()

    expect(() => product.addPhoto('https://example.com/photo.jpg')).toThrow(DomainError)
  })

  it('rehydrates from a snapshot without losing the invariant', () => {
    const original = Product.createDraft('PRODUCT-2', { name: 'Perfume X', category: 'perfume' })
    original.addPhoto('https://example.com/photo.jpg')
    original.approvePhoto('https://example.com/photo.jpg')
    original.assignAffiliateLink('https://example.com/link')
    original.activate()

    const rehydrated = Product.rehydrate(original.toSnapshot())

    expect(rehydrated.getStatus()).toBe('active')
    expect(() => rehydrated.activate()).not.toThrow()
  })
})
