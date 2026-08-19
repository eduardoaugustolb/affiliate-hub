import { describe, expect, it } from 'bun:test'
import { DeleteUser } from '../../src/application/use-cases/DeleteUser'
import { User } from '../../src/domain/User'
import { UserRepositoryFake } from './doubles/UserRepositoryFake'

describe('DeleteUser', () => {
  it('deletes an existing user', async () => {
    const userRepository = new UserRepositoryFake()
    const useCase = new DeleteUser(userRepository)
    await userRepository.save(
      User.create('USER-1', {
        email: 'jane@example.com',
        name: 'Jane',
        passwordHash: 'password-hash',
      }),
    )

    await useCase.execute({ userId: 'USER-1' })

    expect(await userRepository.findById('USER-1')).toBeNull()
  })

  it('is idempotent when the user does not exist', async () => {
    const useCase = new DeleteUser(new UserRepositoryFake())

    await useCase.execute({ userId: 'MISSING' })
  })
})
