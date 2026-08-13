import { afterEach, beforeAll, describe, expect, it } from 'bun:test'
import { User, UserRepositorySql } from '@affiliate-hub/identity-access'
import { Argon2Hasher } from '../../../src/adapters/crypto/Argon2Hasher'
import { CipherAdapter } from '../../../src/adapters/crypto/CipherAdapter'
import { HmacKeyedHasher } from '../../../src/adapters/crypto/HmacKeyedHasher'
import { PgAdapter } from '../../../src/adapters/database/PgAdapter'
import { createServer } from '../../../src/main'

const DATABASE_URL =
  process.env.DATABASE_URL ?? 'postgres://postgres:postgres@localhost:5433/drops_do_frost'
const TEST_PORT = 3055
const BASE_URL = `http://localhost:${TEST_PORT}`

describe('Catalog HTTP routes (integration)', () => {
  const db = new PgAdapter(DATABASE_URL)
  const insertedIds: string[] = []
  const userId = 'catalog-integration-user'
  let authHeaders: HeadersInit

  beforeAll(async () => {
    process.env.DATABASE_URL = DATABASE_URL
    const passwordHasher = new Argon2Hasher()
    const userRepository = new UserRepositorySql(
      db,
      new CipherAdapter(Buffer.from(process.env.PII_ENCRYPTION_KEY as string, 'base64url')),
      new HmacKeyedHasher(process.env.EMAIL_LOOKUP_HMAC_KEY as string),
    )
    await db.query('delete from users where id = $1', [userId])
    await userRepository.save(
      User.create(userId, {
        email: 'catalog-integration@example.com',
        name: 'Catalog Integration',
        passwordHash: await passwordHasher.hash('integration-password'),
      }),
    )
    const httpServer = createServer()
    await httpServer.listen(TEST_PORT)
    const login = await fetch(`${BASE_URL}/session`, {
      method: 'POST',
      headers: { 'content-type': 'application/json', ...authHeaders },
      body: JSON.stringify({ email: 'catalog-integration@example.com', password: 'integration-password' }),
    })
    const sessionCookie = login.headers.get('set-cookie')?.split(';')[0]
    if (!sessionCookie) throw new Error(`Session cookie was not set: ${login.status} ${await login.text()}`)
    authHeaders = { cookie: sessionCookie }
  })

  afterEach(async () => {
    while (insertedIds.length > 0) {
      const id = insertedIds.pop()
      await db.query('delete from products where id = $1', [id])
    }
  })

  it('POST /products creates a draft product', async () => {
    const response = await fetch(`${BASE_URL}/products`, {
      method: 'POST',
      headers: { 'content-type': 'application/json', ...authHeaders },
      body: JSON.stringify({ name: 'Oversized Hoodie', category: 'streetwear' }),
    })
    const body = (await response.json()) as { message: string; productId: string }
    insertedIds.push(body.productId)

    expect(response.status).toBe(201)
    expect(body.message).toBe('Product created successfully')
    expect(body.productId).toMatch(/^[0-9a-f-]{36}$/)
  })

  it('GET /products/curation lists drafts just created', async () => {
    const created = await fetch(`${BASE_URL}/products`, {
      method: 'POST',
      headers: { 'content-type': 'application/json', ...authHeaders },
      body: JSON.stringify({ name: 'Cap', category: 'streetwear' }),
    })
    const { productId } = (await created.json()) as { message: string; productId: string }
    insertedIds.push(productId)

    const response = await fetch(`${BASE_URL}/products/curation`, { headers: authHeaders })
    const body = (await response.json()) as { message: string; products: Array<{ id: string }> }

    expect(response.status).toBe(200)
    expect(body.message).toBe('Products retrieved successfully')
    expect(body.products.some((product) => product.id === productId)).toBe(true)
  })

  it('POST /products/:id/approve-media approves a photo and can activate the product', async () => {
    const created = await fetch(`${BASE_URL}/products`, {
      method: 'POST',
      headers: { 'content-type': 'application/json', ...authHeaders },
      body: JSON.stringify({ name: 'Perfume X', category: 'perfume' }),
    })
    const { productId } = (await created.json()) as { message: string; productId: string }
    insertedIds.push(productId)

    // Media curation only approves a photo that already exists on the product —
    // it doesn't add one (that arrives via a future upload flow, see MediaTemplate).
    // Seed the precondition directly, same as that future flow would.
    await db.query('update products set affiliate_link_url = $1, photos = $2 where id = $3', [
      'https://example.com/link',
      JSON.stringify([{ url: 'https://example.com/photo.jpg', approved: false }]),
      productId,
    ])

    const response = await fetch(`${BASE_URL}/products/${productId}/approve-media`, {
      method: 'POST',
      headers: { 'content-type': 'application/json', ...authHeaders },
      body: JSON.stringify({ photoUrl: 'https://example.com/photo.jpg', tryActivate: true }),
    })
    const body = (await response.json()) as { message: string; status: string }

    expect(response.status).toBe(200)
    expect(body.message).toBe('Product media approved successfully')
    expect(body.status).toBe('active')
  })

  it('POST /products/:id/deactivate soft-deletes the product', async () => {
    const created = await fetch(`${BASE_URL}/products`, {
      method: 'POST',
      headers: { 'content-type': 'application/json', ...authHeaders },
      body: JSON.stringify({ name: 'Bucket Hat', category: 'streetwear' }),
    })
    const { productId } = (await created.json()) as { message: string; productId: string }
    insertedIds.push(productId)

    const response = await fetch(`${BASE_URL}/products/${productId}/deactivate`, {
      method: 'POST',
      headers: authHeaders,
    })

    expect(response.status).toBe(200)

    const rows = await db.query<{ status: string }>('select status from products where id = $1', [
      productId,
    ])
    expect(rows[0]?.status).toBe('inactive')
  })

  it('POST /products/:id/approve-media maps NotFoundError to 404', async () => {
    const response = await fetch(`${BASE_URL}/products/DOES-NOT-EXIST/approve-media`, {
      method: 'POST',
      headers: { 'content-type': 'application/json', ...authHeaders },
      body: JSON.stringify({ photoUrl: 'https://example.com/photo.jpg' }),
    })
    const body = (await response.json()) as { message: string }

    expect(response.status).toBe(404)
    expect(body.message).toContain('DOES-NOT-EXIST')
  })

  it('POST /products/:id/approve-media maps DomainError to 400', async () => {
    const created = await fetch(`${BASE_URL}/products`, {
      method: 'POST',
      headers: { 'content-type': 'application/json', ...authHeaders },
      body: JSON.stringify({ name: 'Perfume Y', category: 'perfume' }),
    })
    const { productId } = (await created.json()) as { message: string; productId: string }
    insertedIds.push(productId)

    // Photo exists and gets approved, but no affiliate link was ever assigned —
    // activate() must reject on that specific invariant.
    await db.query('update products set photos = $1 where id = $2', [
      JSON.stringify([{ url: 'https://example.com/photo.jpg', approved: false }]),
      productId,
    ])

    const response = await fetch(`${BASE_URL}/products/${productId}/approve-media`, {
      method: 'POST',
      headers: { 'content-type': 'application/json', ...authHeaders },
      body: JSON.stringify({ photoUrl: 'https://example.com/photo.jpg', tryActivate: true }),
    })
    const body = (await response.json()) as { message: string }

    expect(response.status).toBe(400)
    expect(body.message).toContain('affiliate link')
  })
})
