import { afterEach, describe, expect, it } from 'bun:test'
import { Product } from '@affiliate-hub/catalog'
import { ProductRepositorySql } from '@affiliate-hub/catalog/adapters'
import { PgAdapter } from '../../../src/adapters/database/PgAdapter'

const DATABASE_URL =
  process.env.DATABASE_URL ?? 'postgres://postgres:postgres@localhost:5433/drops_do_frost'

describe('ProductRepositorySql (integration)', () => {
  const db = new PgAdapter(DATABASE_URL)
  const productRepository = new ProductRepositorySql(db)
  const insertedIds: string[] = []

  afterEach(async () => {
    while (insertedIds.length > 0) {
      const id = insertedIds.pop()
      await db.query('delete from products where id = $1', [id])
    }
  })

  it('saves and finds a product by id', async () => {
    const product = Product.createDraft(crypto.randomUUID(), {
      name: 'Oversized Hoodie',
      category: 'streetwear',
    })
    insertedIds.push(product.getId())

    await productRepository.save(product)
    const found = await productRepository.findById(product.getId())

    expect(found).not.toBeNull()
    expect(found?.getStatus()).toBe('draft')
    expect(found?.toSnapshot().name).toBe('Oversized Hoodie')
  })

  it('round-trips photos and activation state through the jsonb column', async () => {
    const product = Product.createDraft(crypto.randomUUID(), {
      name: 'Perfume X',
      category: 'perfume',
    })
    insertedIds.push(product.getId())
    product.addPhoto('https://example.com/photo.jpg')
    product.approvePhoto('https://example.com/photo.jpg')
    product.assignAffiliateLink('https://example.com/link')
    product.activate()

    await productRepository.save(product)
    const found = await productRepository.findById(product.getId())

    expect(found?.getStatus()).toBe('active')
    expect(found?.toSnapshot().photos).toEqual([
      { url: 'https://example.com/photo.jpg', approved: true },
    ])
  })

  it('lists only products with the given status, excluding removed ones', async () => {
    const draft = Product.createDraft(crypto.randomUUID(), { name: 'Cap', category: 'streetwear' })
    const removed = Product.createDraft(crypto.randomUUID(), {
      name: 'Old Cap',
      category: 'streetwear',
    })
    removed.deactivate()
    insertedIds.push(draft.getId(), removed.getId())

    await productRepository.save(draft)
    await productRepository.save(removed)

    const drafts = await productRepository.listByStatus('draft')
    const draftIds = drafts.map((product) => product.getId())

    expect(draftIds).toContain(draft.getId())
    expect(draftIds).not.toContain(removed.getId())
  })

  it('upserts on save instead of duplicating the row', async () => {
    const product = Product.createDraft(crypto.randomUUID(), {
      name: 'Bucket Hat',
      category: 'streetwear',
    })
    insertedIds.push(product.getId())
    await productRepository.save(product)

    product.deactivate()
    await productRepository.save(product)

    const found = await productRepository.findById(product.getId())
    expect(found?.getStatus()).toBe('inactive')
  })

  it('findById returns null for a product that does not exist', async () => {
    const found = await productRepository.findById('DOES-NOT-EXIST')
    expect(found).toBeNull()
  })
})
