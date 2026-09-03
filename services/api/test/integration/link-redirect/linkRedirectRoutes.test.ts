import { afterEach, beforeAll, describe, expect, it } from 'bun:test'
import { User, UserRepositorySql } from '@affiliate-hub/identity-access'
import { Argon2Hasher } from '../../../src/adapters/crypto/Argon2Hasher'
import { CipherAdapter } from '../../../src/adapters/crypto/CipherAdapter'
import { HmacKeyedHasher } from '../../../src/adapters/crypto/HmacKeyedHasher'
import { PgAdapter } from '../../../src/adapters/database/PgAdapter'
import { createServer } from '../../../src/main'

const DATABASE_URL =
  process.env.DATABASE_URL ?? 'postgres://postgres:postgres@localhost:5433/drops_do_frost'
const TEST_PORT = 3056
const BASE_URL = `http://localhost:${TEST_PORT}`

describe('LinkRedirect HTTP routes (integration)', () => {
  const db = new PgAdapter(DATABASE_URL)
  const insertedIds: string[] = []
  const userId = 'redirect-integration-user'
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
        email: 'redirect-integration@example.com',
        name: 'Redirect Integration',
        passwordHash: await passwordHasher.hash('integration-password'),
      }),
    )
    const httpServer = createServer({
      affiliateLinkGenerator: {
        async generateAffiliateLink(): Promise<string> {
          return 'https://example.com/redirect-target'
        },
      },
    })
    await httpServer.listen(TEST_PORT)
    const login = await fetch(`${BASE_URL}/session`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({
        email: 'redirect-integration@example.com',
        password: 'integration-password',
      }),
    })
    const sessionCookie = login.headers.get('set-cookie')?.split(';')[0]
    if (!sessionCookie)
      throw new Error(`Session cookie was not set: ${login.status} ${await login.text()}`)
    authHeaders = { cookie: sessionCookie }
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
      headers: { 'content-type': 'application/json', ...authHeaders },
      body: JSON.stringify({
        name: 'Perfume Redirect',
        category: 'perfume',
        productUrl: 'https://shopee.com.br/perfume-redirect',
      }),
    })
    const { productId } = (await created.json()) as { message: string; productId: string }
    insertedIds.push(productId)

    await db.query('update products set status = $1, affiliate_link_url = $2 where id = $3', [
      'active',
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

  it('GET /p/:id returns 404 for a deactivated product even when its link is still present', async () => {
    const created = await fetch(`${BASE_URL}/products`, {
      method: 'POST',
      headers: { 'content-type': 'application/json', ...authHeaders },
      body: JSON.stringify({ name: 'Perfume Inactive', category: 'perfume' }),
    })
    const { productId } = (await created.json()) as { message: string; productId: string }
    insertedIds.push(productId)

    await db.query('update products set status = $1, affiliate_link_url = $2 where id = $3', [
      'inactive',
      'https://example.com/stale-target',
      productId,
    ])

    const response = await fetch(`${BASE_URL}/p/${productId}`, { redirect: 'manual' })

    expect(response.status).toBe(404)
    const rows = await db.query<{ product_id: string }>(
      'select product_id from click_logs where product_id = $1',
      [productId],
    )
    expect(rows).toHaveLength(0)
  })

  it('GET /p/:id maps NotFoundError to 404 when the product does not exist', async () => {
    const response = await fetch(`${BASE_URL}/p/DOES-NOT-EXIST`, { redirect: 'manual' })
    const body = (await response.json()) as { message: string }

    expect(response.status).toBe(404)
    expect(body.message).toContain('DOES-NOT-EXIST')
  })

  it('GET /p/:id maps NotFoundError to 404 when the product has no affiliate link yet', async () => {
    const created = await fetch(`${BASE_URL}/products`, {
      method: 'POST',
      headers: { 'content-type': 'application/json', ...authHeaders },
      body: JSON.stringify({
        name: 'Perfume No Link',
        category: 'perfume',
        productUrl: 'https://shopee.com.br/perfume-no-link',
      }),
    })
    const { productId } = (await created.json()) as { message: string; productId: string }
    insertedIds.push(productId)

    await db.query('update products set affiliate_link_url = null where id = $1', [productId])

    const response = await fetch(`${BASE_URL}/p/${productId}`, { redirect: 'manual' })

    expect(response.status).toBe(404)
  })
})
