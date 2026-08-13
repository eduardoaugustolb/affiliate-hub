import { describe, expect, it } from 'bun:test'
import { Session } from '../src'
import { Logout } from '../src/application/use-cases/Logout'
import { KeyedHasherFake } from './doubles/KeyedHasherFake'
import { SessionRepositoryFake } from './doubles/SessionRepositoryFake'

const TOKEN = 'session-token'

async function setup() {
  const sessionRepository = new SessionRepositoryFake()
  const keyedHasher = new KeyedHasherFake()
  const useCase = new Logout(sessionRepository, keyedHasher)

  await sessionRepository.save(
    Session.create('SESSION-1', {
      tokenHash: await keyedHasher.hash(TOKEN),
      userId: 'USER-1',
      expiresAt: new Date(Date.now() + 1000 * 60 * 60 * 24),
    }),
  )

  return { useCase, sessionRepository, keyedHasher }
}

describe('Logout', () => {
  it('should be able to logout', async () => {
    const { useCase, sessionRepository, keyedHasher } = await setup()
    await useCase.execute({ token: TOKEN })
    const session = await sessionRepository.findByTokenHash(await keyedHasher.hash(TOKEN))
    expect(session).toBeNull()
  })

  it('is idempotent when the session no longer exists', async () => {
    const { useCase } = await setup()
    expect(useCase.execute({ token: 'unknown-token' })).resolves.toBeUndefined()
  })
})
