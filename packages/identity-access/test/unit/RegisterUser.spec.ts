import { describe, expect, it } from 'bun:test'
import { DomainError } from '@affiliate-hub/shared-kernel'
import { UserAlreadyExistsError } from '../../src'
import { RegisterUser } from '../../src/application/use-cases/RegisterUser'
import { Email } from '../../src/domain/Email'
import { IdGeneratorFake } from './doubles/IdGeneratorFake'
import { PasswordHasherFake } from './doubles/PasswordHasherFake'
import { UserRepositoryFake } from './doubles/UserRepositoryFake'

async function setup() {
  const userRepository = new UserRepositoryFake()
  const passwordHasher = new PasswordHasherFake()
  const idGenerator = new IdGeneratorFake()
  const useCase = new RegisterUser(userRepository, passwordHasher, idGenerator)

  return { useCase, userRepository, passwordHasher, idGenerator }
}

describe('RegisterUser', () => {
  it('should be able to register a user', async () => {
    const { useCase, userRepository } = await setup()
    const result = await useCase.execute({
      name: 'Jhon',
      email: 'jhon@example.com',
      password: 'password',
    })

    expect(result).toBeUndefined()
    const user = await userRepository.findByEmail(Email.create('jhon@example.com'))
    expect(user?.toSnapshot()).toEqual({
      id: 'fake-id-1',
      name: 'Jhon',
      email: 'jhon@example.com',
      passwordHash: 'hashed:password',
    })
  })

  it('throws UserAlreadyExistsError when user already exists', async () => {
    const { useCase } = await setup()
    await useCase.execute({
      name: 'Jhon',
      email: 'jhon@example.com',
      password: 'password',
    })

    expect(
      useCase.execute({
        name: 'Jhon',
        email: 'jhon@example.com',
        password: 'password',
      }),
    ).rejects.toThrow(UserAlreadyExistsError)
  })

  it('throws DomainError when email is invalid', async () => {
    const { useCase } = await setup()
    expect(
      useCase.execute({
        name: 'Jhon',
        email: 'invalid-email',
        password: 'password',
      }),
    ).rejects.toThrow(DomainError)
  })

  it('throws DomainError when name is blank', async () => {
    const { useCase } = await setup()

    expect(
      useCase.execute({
        name: '  ',
        email: 'jhon@example.com',
        password: 'password',
      }),
    ).rejects.toThrow(DomainError)
  })
})
