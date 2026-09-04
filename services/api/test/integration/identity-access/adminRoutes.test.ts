import { afterEach, beforeEach, describe, expect, it } from 'bun:test'
import type {
  IdentityAccessTransactionScope,
  IdentityAccessUnitOfWork,
} from '@affiliate-hub/identity-access'
import { SetupInitialUser } from '@affiliate-hub/identity-access'
import type { Clock, HttpServer } from '@affiliate-hub/shared-kernel'
import { IdGeneratorFake } from '../../../../../packages/identity-access/test/unit/doubles/IdGeneratorFake'
import { KeyedHasherFake } from '../../../../../packages/identity-access/test/unit/doubles/KeyedHasherFake'
import { PasswordHasherFake } from '../../../../../packages/identity-access/test/unit/doubles/PasswordHasherFake'
import { SessionRepositoryFake } from '../../../../../packages/identity-access/test/unit/doubles/SessionRepositoryFake'
import { TokenGeneratorFake } from '../../../../../packages/identity-access/test/unit/doubles/TokenGeneratorFake'
import { UserRepositoryFake } from '../../../../../packages/identity-access/test/unit/doubles/UserRepositoryFake'
import { BunRuntimeServer } from '../../../src/adapters/http/BunRuntimeServer'
import { HonoHttpServer } from '../../../src/adapters/http/HonoHttpServer'
import { registerAdminRoutes } from '../../../src/http/routes/adminRoutes'

let nextPort = 3070
const clock: Clock = { now: () => new Date('2026-08-20T12:00:00.000Z') }

class IdentityAccessUnitOfWorkFake implements IdentityAccessUnitOfWork {
  constructor(private readonly scope: IdentityAccessTransactionScope) {}

  async serializable<T>(
    callback: (scope: IdentityAccessTransactionScope) => Promise<T>,
  ): Promise<T> {
    return callback(this.scope)
  }
}

describe('Admin setup HTTP route (integration)', () => {
  let server: HttpServer
  let userRepository: UserRepositoryFake
  let baseUrl: string

  beforeEach(async () => {
    userRepository = new UserRepositoryFake()
    const sessionRepository = new SessionRepositoryFake()
    const passwordHasher = new PasswordHasherFake()
    const tokenGenerator = new TokenGeneratorFake()
    const keyedHasher = new KeyedHasherFake()
    const idGenerator = new IdGeneratorFake()

    server = new HonoHttpServer(new BunRuntimeServer())
    registerAdminRoutes(server, {
      setupInitialUser: new SetupInitialUser(
        new IdentityAccessUnitOfWorkFake({
          users: userRepository,
          sessions: sessionRepository,
          clock,
        }),
        idGenerator,
        passwordHasher,
        tokenGenerator,
        keyedHasher,
        clock,
      ),
    })
    const port = nextPort++
    baseUrl = `http://localhost:${port}`
    await server.listen(port)
  })

  afterEach(async () => {
    await server.stop()
  })

  it('creates the first user and opens its session', async () => {
    const response = await fetch(`${baseUrl}/admin/setup`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({
        email: 'admin@example.com',
        name: 'Admin',
        password: 'valid-password',
      }),
    })

    expect(response.status).toBe(201)
    expect(await response.json()).toEqual({ message: 'User registered successfully' })
    expect(response.headers.get('set-cookie')).toContain('__Host-session=fake-token-1')
    expect(await userRepository.hasAnyUser()).toBe(true)
  })

  it('refuses setup after the first user exists', async () => {
    const firstSetup = await fetch(`${baseUrl}/admin/setup`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({
        email: 'admin@example.com',
        name: 'Admin',
        password: 'valid-password',
      }),
    })
    expect(firstSetup.status).toBe(201)

    const secondSetup = await fetch(`${baseUrl}/admin/setup`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({
        email: 'other@example.com',
        name: 'Other',
        password: 'another-password',
      }),
    })

    expect(secondSetup.status).toBe(409)
    expect(await secondSetup.json()).toEqual({
      code: 'CONFLICT',
      message: 'Initial setup has already been completed',
    })
  })

  it('rejects a setup payload with a missing required field', async () => {
    const response = await fetch(`${baseUrl}/admin/setup`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ email: 'admin@example.com', name: 'Admin' }),
    })

    expect(response.status).toBe(400)
    expect(await response.json()).toEqual({
      code: 'BAD_REQUEST',
      message: 'Missing required fields',
    })
    expect(await userRepository.hasAnyUser()).toBe(false)
  })
})
