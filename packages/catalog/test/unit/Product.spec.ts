import { describe, expect, it } from 'bun:test'

const now = new Date('2026-08-20T12:00:00.000Z')

import { DomainError } from '@affiliate-hub/shared-kernel'
import { Product } from '../../src/domain/Product'

describe('Product', () => {
  it('starts as draft', () => {
    const product = Product.createDraft(
      'PRODUCT-1',
      {
        name: 'Oversized Hoodie',
        category: 'streetwear',
      },
      now,
    )

    expect(product.getStatus()).toBe('draft')
  })

  it('does not activate without an approved photo', () => {
    const product = Product.createDraft(
      'PRODUCT-2',
      { name: 'Perfume X', category: 'perfume' },
      now,
    )
    product.assignAffiliateLink('https://example.com/link', now)

    expect(() => product.activate(now)).toThrow(DomainError)
    expect(() => product.activate(now)).toThrow(/approved photo/)
  })

  it('does not activate without an affiliate link', () => {
    const product = Product.createDraft(
      'PRODUCT-2',
      { name: 'Perfume X', category: 'perfume' },
      now,
    )
    product.addPhoto('https://example.com/photo.jpg', now)
    product.approvePhoto('https://example.com/photo.jpg', now)

    expect(() => product.activate(now)).toThrow(DomainError)
    expect(() => product.activate(now)).toThrow(/affiliate link/)
  })

  it('activates once it has an approved photo and an affiliate link', () => {
    const product = Product.createDraft(
      'PRODUCT-2',
      { name: 'Perfume X', category: 'perfume' },
      now,
    )
    product.addPhoto('https://example.com/photo.jpg', now)
    product.approvePhoto('https://example.com/photo.jpg', now)
    product.assignAffiliateLink('https://example.com/link', now)

    product.activate(now)

    expect(product.getStatus()).toBe('active')
  })

  it('deactivates and stamps removedAt (soft delete)', () => {
    const product = Product.createDraft(
      'PRODUCT-2',
      { name: 'Perfume X', category: 'perfume' },
      now,
    )

    product.deactivate(now, now)

    expect(product.getStatus()).toBe('inactive')
    expect(product.toSnapshot().removedAt).not.toBeNull()
  })

  it('a removed product cannot be changed', () => {
    const product = Product.createDraft(
      'PRODUCT-2',
      { name: 'Perfume X', category: 'perfume' },
      now,
    )
    product.deactivate(now, now)

    expect(() => product.addPhoto('https://example.com/photo.jpg', now)).toThrow(DomainError)
  })

  it('rehydrates from a snapshot without losing the invariant', () => {
    const original = Product.createDraft(
      'PRODUCT-2',
      { name: 'Perfume X', category: 'perfume' },
      now,
    )
    original.addPhoto('https://example.com/photo.jpg', now)
    original.approvePhoto('https://example.com/photo.jpg', now)
    original.assignAffiliateLink('https://example.com/link', now)
    original.activate(now)

    const rehydrated = Product.rehydrate(original.toSnapshot())

    expect(rehydrated.getStatus()).toBe('active')
    expect(() => rehydrated.activate(now)).not.toThrow()
  })
})
