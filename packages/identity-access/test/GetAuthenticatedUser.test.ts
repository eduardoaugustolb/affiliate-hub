import { describe, expect, it } from 'bun:test'
import { InvalidCredentialsError } from '../src/application/errors/InvalidCredentialsError'
import { GetAuthenticatedUser } from '../src/application/use-cases/GetAuthenticatedUser'
import { Session } from '../src/domain/Session'
import { User } from '../src/domain/User'
import { SessionRepositoryFake } from './doubles/SessionRepositoryFake'
import { TokenHasherFake } from './doubles/TokenHasherFake'
import { UserRepositoryFake } from './doubles/UserRepositoryFake'

const RAW_TOKEN = 'raw-session-token'

function futureDate(): Date {
  return new Date(Date.now() + 20 * 24 * 60 * 60 * 1000)
}

function pastDate(): Date {
  return new Date(Date.now() - 1000)
}

async function setup() {
  const userRepository = new UserRepositoryFake()
  const sessionRepository = new SessionRepositoryFake()
  const tokenHasher = new TokenHasherFake()

  const useCase = new GetAuthenticatedUser(userRepository, sessionRepository, tokenHasher)

  const user = User.create('USER-1', {
    email: 'jane@example.com',
    name: 'Jane',
    passwordHash: 'irrelevant-hash',
  })
  await userRepository.save(user)

  return { useCase, userRepository, sessionRepository, tokenHasher, user }
}

describe('GetAuthenticatedUser', () => {
  it('returns the user for a valid, non-expired session token', async () => {
    const { useCase, sessionRepository, tokenHasher, user } = await setup()
    await sessionRepository.save(
      Session.create('SESSION-1', {
        tokenHash: tokenHasher.hash(RAW_TOKEN),
        userId: user.getId(),
        expiresAt: futureDate(),
      }),
    )

    const output = await useCase.execute({ token: RAW_TOKEN })

    expect(output.user.getId()).toBe(user.getId())
  })

  it('throws InvalidCredentialsError when no session matches the token', async () => {
    const { useCase } = await setup()

    await expect(useCase.execute({ token: 'unknown-token' })).rejects.toThrow(
      InvalidCredentialsError,
    )
  })

  it('throws InvalidCredentialsError when the session is expired', async () => {
    const { useCase, sessionRepository, tokenHasher, user } = await setup()
    await sessionRepository.save(
      Session.create('SESSION-2', {
        tokenHash: tokenHasher.hash(RAW_TOKEN),
        userId: user.getId(),
        expiresAt: pastDate(),
      }),
    )

    await expect(useCase.execute({ token: RAW_TOKEN })).rejects.toThrow(InvalidCredentialsError)
  })

  it('throws InvalidCredentialsError when the session points to a user that no longer exists', async () => {
    const { useCase, sessionRepository, tokenHasher } = await setup()
    await sessionRepository.save(
      Session.create('SESSION-3', {
        tokenHash: tokenHasher.hash(RAW_TOKEN),
        userId: 'MISSING-USER',
        expiresAt: futureDate(),
      }),
    )

    await expect(useCase.execute({ token: RAW_TOKEN })).rejects.toThrow(InvalidCredentialsError)
  })
})
