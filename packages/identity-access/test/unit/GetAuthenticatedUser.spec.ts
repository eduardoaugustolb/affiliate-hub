import { describe, expect, it } from 'bun:test'
import { InvalidCredentialsError } from '../../src/application/errors/InvalidCredentialsError'
import { GetAuthenticatedUser } from '../../src/application/use-cases/GetAuthenticatedUser'
import { Session } from '../../src/domain/Session'
import { User } from '../../src/domain/User'
import { KeyedHasherFake } from './doubles/KeyedHasherFake'
import { SessionRepositoryFake } from './doubles/SessionRepositoryFake'
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
  const keyedHasher = new KeyedHasherFake()

  const useCase = new GetAuthenticatedUser(userRepository, sessionRepository, keyedHasher)

  const user = User.create('USER-1', {
    email: 'jane@example.com',
    name: 'Jane',
    passwordHash: 'irrelevant-hash',
  })
  await userRepository.save(user)

  return { useCase, userRepository, sessionRepository, keyedHasher, user }
}

describe('GetAuthenticatedUser', () => {
  it('returns the user for a valid, non-expired session token', async () => {
    const { useCase, sessionRepository, keyedHasher, user } = await setup()
    await sessionRepository.save(
      Session.create('SESSION-1', {
        tokenHash: await keyedHasher.hash(RAW_TOKEN),
        userId: user.getId(),
        expiresAt: futureDate(),
      }),
    )

    const output = await useCase.execute({ token: RAW_TOKEN })

    expect(output.user).toEqual({
      id: user.getId(),
      email: 'jane@example.com',
      name: 'Jane',
    })
  })

  it('throws InvalidCredentialsError when no session matches the token', async () => {
    const { useCase } = await setup()

    expect(useCase.execute({ token: 'unknown-token' })).rejects.toThrow(InvalidCredentialsError)
  })

  it('throws InvalidCredentialsError when the session is expired', async () => {
    const { useCase, sessionRepository, keyedHasher, user } = await setup()
    await sessionRepository.save(
      Session.create('SESSION-2', {
        tokenHash: await keyedHasher.hash(RAW_TOKEN),
        userId: user.getId(),
        expiresAt: pastDate(),
      }),
    )

    return expect(useCase.execute({ token: RAW_TOKEN })).rejects.toThrow(InvalidCredentialsError)
  })

  it('throws InvalidCredentialsError when the session points to a user that no longer exists', async () => {
    const { useCase, sessionRepository, keyedHasher } = await setup()
    await sessionRepository.save(
      Session.create('SESSION-3', {
        tokenHash: await keyedHasher.hash(RAW_TOKEN),
        userId: 'MISSING-USER',
        expiresAt: futureDate(),
      }),
    )

    return expect(useCase.execute({ token: RAW_TOKEN })).rejects.toThrow(InvalidCredentialsError)
  })
})
