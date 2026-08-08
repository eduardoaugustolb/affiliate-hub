import { afterEach, beforeAll, describe, expect, it } from 'bun:test'
import { PgAdapter } from '../../../src/adapters/PgAdapter'
import { createServer } from '../../../src/main'

const DATABASE_URL =
  process.env.DATABASE_URL ?? 'postgres://postgres:postgres@localhost:5433/drops_do_frost'
const TEST_PORT = 3056
const BASE_URL = `http://localhost:${TEST_PORT}`

describe('LinkRedirect HTTP routes (integration)', () => {
  const db = new PgAdapter(DATABASE_URL)
  const insertedIds: string[] = []

  beforeAll(async () => {
    process.env.DATABASE_URL = DATABASE_URL
    const httpServer = createServer()
    await httpServer.listen(TEST_PORT)
  })

  afterEach(async () => {
    while (insertedIds.length > 0) {
      const id = insertedIds.pop()
      await db.query('delete from products where id = $1', [id])
      await db.query('delete from click_logs where product_id = $1', [id])
    }
  })

  it('GET /p/:id redirects to the current affiliate link and logs a click', async () => {
    const created = await fetch(`${BASE_URL}/products`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ name: 'Perfume Redirect', category: 'perfume' }),
    })
    const { productId } = (await created.json()) as { productId: string }
    insertedIds.push(productId)

    await db.query('update products set affiliate_link_url = $1 where id = $2', [
      'https://example.com/redirect-target',
      productId,
    ])

    const response = await fetch(`${BASE_URL}/p/${productId}`, { redirect: 'manual' })

    expect(response.status).toBe(302)
    expect(response.headers.get('location')).toBe('https://example.com/redirect-target')

    const rows = await db.query<{ product_id: string }>(
      'select product_id from click_logs where product_id = $1',
      [productId],
    )
    expect(rows).toHaveLength(1)
  })

  it('GET /p/:id maps NotFoundError to 404 when the product does not exist', async () => {
    const response = await fetch(`${BASE_URL}/p/DOES-NOT-EXIST`, { redirect: 'manual' })
    const body = (await response.json()) as { error: string }

    expect(response.status).toBe(404)
    expect(body.error).toContain('DOES-NOT-EXIST')
  })

  it('GET /p/:id maps NotFoundError to 404 when the product has no affiliate link yet', async () => {
    const created = await fetch(`${BASE_URL}/products`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ name: 'Perfume No Link', category: 'perfume' }),
    })
    const { productId } = (await created.json()) as { productId: string }
    insertedIds.push(productId)

    const response = await fetch(`${BASE_URL}/p/${productId}`, { redirect: 'manual' })

    expect(response.status).toBe(404)
  })
})
