import { describe, expect, it } from 'bun:test'
import { NotFoundError } from '@affiliate-hub/shared-kernel'
import { UserAlreadyExistsError } from '../src'
import { UpdateUser } from '../src/application/use-cases/UpdateUser'
import { User } from '../src/domain/User'
import { UserRepositoryFake } from './doubles/UserRepositoryFake'

async function setup() {
  const userRepository = new UserRepositoryFake()
  const useCase = new UpdateUser(userRepository)
  const user = User.create('USER-1', {
    email: 'jane@example.com',
    name: 'Jane',
    passwordHash: 'password-hash',
  })
  await userRepository.save(user)

  return { useCase, userRepository, user }
}

describe('UpdateUser', () => {
  it('updates name without changing other user data', async () => {
    const { useCase, userRepository, user } = await setup()

    await useCase.execute({ userId: user.getId(), name: 'Jane Doe' })

    expect((await userRepository.findById(user.getId()))?.toSnapshot()).toEqual({
      id: 'USER-1',
      email: 'jane@example.com',
      name: 'Jane Doe',
      passwordHash: 'password-hash',
    })
  })

  it('updates email when it is not in use', async () => {
    const { useCase, userRepository, user } = await setup()

    await useCase.execute({ userId: user.getId(), email: 'jane.doe@example.com' })

    expect((await userRepository.findById(user.getId()))?.getEmail().toString()).toBe(
      'jane.doe@example.com',
    )
  })

  it('rejects an unknown user', async () => {
    const { useCase } = await setup()

    return expect(useCase.execute({ userId: 'MISSING', name: 'Jane Doe' })).rejects.toThrow(
      NotFoundError,
    )
  })

  it('rejects an email already assigned to another user', async () => {
    const { useCase, userRepository, user } = await setup()
    await userRepository.save(
      User.create('USER-2', {
        email: 'john@example.com',
        name: 'John',
        passwordHash: 'password-hash',
      }),
    )

    return expect(
      useCase.execute({ userId: user.getId(), email: 'john@example.com' }),
    ).rejects.toThrow(UserAlreadyExistsError)
  })

  it('rejects the current email as already in use', async () => {
    const { useCase, user } = await setup()

    return expect(
      useCase.execute({ userId: user.getId(), email: 'jane@example.com' }),
    ).rejects.toThrow(UserAlreadyExistsError)
  })
})
