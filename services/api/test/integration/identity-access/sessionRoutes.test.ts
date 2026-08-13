import { afterAll, beforeAll, describe, expect, it } from 'bun:test'
import {
  AuthenticateUser,
  DeleteUser,
  GetAuthenticatedUser,
  Logout,
  UpdateUser,
  User,
} from '@affiliate-hub/identity-access'
import type { HttpServer } from '@affiliate-hub/shared-kernel'
import { HttpStatus } from '@affiliate-hub/shared-kernel'
import { IdGeneratorFake } from '../../../../../packages/identity-access/test/doubles/IdGeneratorFake'
import { KeyedHasherFake } from '../../../../../packages/identity-access/test/doubles/KeyedHasherFake'
import { PasswordHasherFake } from '../../../../../packages/identity-access/test/doubles/PasswordHasherFake'
import { SessionRepositoryFake } from '../../../../../packages/identity-access/test/doubles/SessionRepositoryFake'
import { TokenGeneratorFake } from '../../../../../packages/identity-access/test/doubles/TokenGeneratorFake'
import { UserRepositoryFake } from '../../../../../packages/identity-access/test/doubles/UserRepositoryFake'
import { BunRuntimeServer } from '../../../src/adapters/http/BunRuntimeServer'
import { HonoHttpServer } from '../../../src/adapters/http/HonoHttpServer'
import { requireAuthentication } from '../../../src/http/middlewares/RequireAuthentication'
import { registerSessionRoutes } from '../../../src/http/routes/sessionRoutes'
import { registerUserRoutes } from '../../../src/http/routes/userRoutes'

const PORT = 3057
const BASE_URL = `http://localhost:${PORT}`
describe('Session HTTP routes (integration)', () => {
  let server: HttpServer

  beforeAll(async () => {
    const userRepository = new UserRepositoryFake()
    const sessionRepository = new SessionRepositoryFake()
    const passwordHasher = new PasswordHasherFake()
    const tokenGenerator = new TokenGeneratorFake()
    const keyedHasher = new KeyedHasherFake()
    const idGenerator = new IdGeneratorFake()

    await userRepository.save(
      User.create('USER-1', {
        email: 'jane@example.com',
        name: 'Jane',
        passwordHash: await passwordHasher.hash('valid-password'),
      }),
    )

    server = new HonoHttpServer(new BunRuntimeServer())
    const getAuthenticatedUser = new GetAuthenticatedUser(
      userRepository,
      sessionRepository,
      keyedHasher,
    )
    registerSessionRoutes(server, {
      authenticateUser: new AuthenticateUser(
        userRepository,
        sessionRepository,
        passwordHasher,
        tokenGenerator,
        keyedHasher,
        idGenerator,
      ),
      getAuthenticatedUser,
      logout: new Logout(sessionRepository, keyedHasher),
    })
    server.use('/users/*', requireAuthentication(getAuthenticatedUser))
    registerUserRoutes(server, {
      updateUser: new UpdateUser(userRepository),
      deleteUser: new DeleteUser(userRepository),
    })
    server.use('/protected', requireAuthentication(getAuthenticatedUser))
    server.get('/protected', async (request, response) => {
      response.status(HttpStatus.OK).sendJson({
        message: 'Protected resource retrieved successfully',
        user: request.context.authenticatedUser as { id: string; email: string; name: string },
      })
    })
    await server.listen(PORT)
  })

  afterAll(async () => {
    await server.stop()
  })

  it('returns 400 when login credentials are missing', async () => {
    const response = await fetch(`${BASE_URL}/session`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ email: 'jane@example.com' }),
    })

    expect(response.status).toBe(400)
    expect(await response.json()).toEqual({ message: 'Email and password are required' })
  })

  it('returns 401 when a session cookie is missing', async () => {
    const response = await fetch(`${BASE_URL}/session`)

    expect(response.status).toBe(401)
    expect(await response.json()).toEqual({ message: 'Unauthorized' })
  })

  it('shares the authenticated user with protected handlers', async () => {
    const login = await fetch(`${BASE_URL}/session`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ email: 'jane@example.com', password: 'valid-password' }),
    })
    expect(login.status).toBe(204)
    const sessionCookie = login.headers.get('set-cookie')?.split(';')[0]
    if (!sessionCookie) throw new Error('Session cookie was not set')

    const unauthorized = await fetch(`${BASE_URL}/protected`)
    expect(unauthorized.status).toBe(401)

    const authorized = await fetch(`${BASE_URL}/protected`, { headers: { cookie: sessionCookie } })
    expect(authorized.status).toBe(200)
    expect(await authorized.json()).toEqual({
      message: 'Protected resource retrieved successfully',
      user: { id: 'USER-1', email: 'jane@example.com', name: 'Jane' },
    })
  })

  it('updates only the authenticated user', async () => {
    const login = await fetch(`${BASE_URL}/session`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ email: 'jane@example.com', password: 'valid-password' }),
    })
    const sessionCookie = login.headers.get('set-cookie')?.split(';')[0]
    if (!sessionCookie) throw new Error('Session cookie was not set')

    const unauthenticatedUpdate = await fetch(`${BASE_URL}/users/me/update`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ name: 'Jane Doe' }),
    })
    expect(unauthenticatedUpdate.status).toBe(401)

    const update = await fetch(`${BASE_URL}/users/me/update`, {
      method: 'POST',
      headers: { 'content-type': 'application/json', cookie: sessionCookie },
      body: JSON.stringify({ name: 'Jane Doe' }),
    })
    expect(update.status).toBe(204)

    const me = await fetch(`${BASE_URL}/session`, { headers: { cookie: sessionCookie } })
    expect(await me.json()).toEqual({
      message: 'Authenticated user retrieved successfully',
      user: { id: 'USER-1', email: 'jane@example.com', name: 'Jane Doe' },
    })
  })

  it('authenticates through a secure cookie and invalidates it on logout', async () => {
    const login = await fetch(`${BASE_URL}/session`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ email: 'jane@example.com', password: 'valid-password' }),
    })

    expect(login.status).toBe(204)
    const setCookie = login.headers.get('set-cookie')
    const sessionCookie = setCookie?.split(';')[0]
    if (!sessionCookie) throw new Error('Session cookie was not set')
    expect(sessionCookie).toStartWith('__Host-session=fake-token-')
    expect(setCookie).toContain('HttpOnly')
    expect(setCookie).toContain('Secure')
    expect(setCookie).toContain('SameSite=Lax')
    expect(setCookie).toContain('Path=/')
    expect(setCookie).toContain('Max-Age=1728000')

    const me = await fetch(`${BASE_URL}/session`, { headers: { cookie: sessionCookie } })
    expect(me.status).toBe(200)
    expect(await me.json()).toEqual({
      message: 'Authenticated user retrieved successfully',
      user: { id: 'USER-1', email: 'jane@example.com', name: 'Jane Doe' },
    })

    const logout = await fetch(`${BASE_URL}/session/logout`, {
      method: 'POST',
      headers: { cookie: sessionCookie },
    })
    expect(logout.status).toBe(204)
    expect(logout.headers.get('set-cookie')).toContain('__Host-session=')
    expect(logout.headers.get('set-cookie')).toContain('Max-Age=0')

    const invalidatedSession = await fetch(`${BASE_URL}/session`, {
      headers: { cookie: sessionCookie },
    })
    expect(invalidatedSession.status).toBe(401)
    expect(await invalidatedSession.json()).toEqual({ message: 'Unauthorized' })
  })
})
