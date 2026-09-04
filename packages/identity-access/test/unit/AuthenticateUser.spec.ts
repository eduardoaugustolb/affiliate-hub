import { describe, expect, it } from 'bun:test'
import { InvalidCredentialsError } from '../../src/application/errors/InvalidCredentialsError'
import { AuthenticateUser } from '../../src/application/use-cases/AuthenticateUser'
import { User } from '../../src/domain/User'
import { IdGeneratorFake } from './doubles/IdGeneratorFake'
import { KeyedHasherFake } from './doubles/KeyedHasherFake'
import { PasswordHasherFake } from './doubles/PasswordHasherFake'
import { SessionRepositoryFake } from './doubles/SessionRepositoryFake'
import { TokenGeneratorFake } from './doubles/TokenGeneratorFake'
import { UserRepositoryFake } from './doubles/UserRepositoryFake'

async function setup() {
  const userRepository = new UserRepositoryFake()
  const sessionRepository = new SessionRepositoryFake()
  const passwordHasher = new PasswordHasherFake()
  const tokenGenerator = new TokenGeneratorFake()
  const keyedHasher = new KeyedHasherFake()
  const idGenerator = new IdGeneratorFake()

  const useCase = new AuthenticateUser(
    userRepository,
    sessionRepository,
    passwordHasher,
    tokenGenerator,
    keyedHasher,
    idGenerator,
  )

  const user = User.create('USER-1', {
    email: 'jane@example.com',
    name: 'Jane',
    passwordHash: await passwordHasher.hash('correct-password'),
  })
  await userRepository.save(user)

  return { useCase, userRepository, sessionRepository, keyedHasher, user }
}

describe('AuthenticateUser', () => {
  it('returns a token and persists a session when credentials are valid', async () => {
    const { useCase, sessionRepository, keyedHasher, user } = await setup()

    const output = await useCase.execute({
      email: 'jane@example.com',
      password: 'correct-password',
    })

    expect(output.token).toBe('fake-token-1')

    const session = await sessionRepository.findByTokenHash(await keyedHasher.hash(output.token))
    expect(session).toBeDefined()
    expect(session?.getUserId()).toBe(user.getId())
  })

  it('creates a session that is not expired yet', async () => {
    const { useCase, sessionRepository, user } = await setup()

    await useCase.execute({ email: 'jane@example.com', password: 'correct-password' })

    const sessions = await sessionRepository.listByUserId(user.getId())
    expect(sessions?.[0]?.isExpired(new Date())).toBe(false)
  })

  it('throws InvalidCredentialsError when the email does not exist', async () => {
    const { useCase } = await setup()

    expect(useCase.execute({ email: 'unknown@example.com', password: 'whatever' })).rejects.toThrow(
      InvalidCredentialsError,
    )
  })

  it('throws InvalidCredentialsError when the password is wrong', async () => {
    const { useCase } = await setup()

    return expect(
      useCase.execute({ email: 'jane@example.com', password: 'wrong-password' }),
    ).rejects.toThrow(InvalidCredentialsError)
  })

  it('does not create a session when authentication fails', async () => {
    const { useCase, sessionRepository, user } = await setup()

    await expect(
      useCase.execute({ email: 'jane@example.com', password: 'wrong-password' }),
    ).rejects.toThrow(InvalidCredentialsError)

    const sessions = await sessionRepository.listByUserId(user.getId())
    expect(sessions).toBeNull()
  })
})
