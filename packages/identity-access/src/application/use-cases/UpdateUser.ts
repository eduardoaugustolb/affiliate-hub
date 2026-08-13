import { NotFoundError, type UseCase } from '@affiliate-hub/shared-kernel'
import { Email } from '../../domain/Email'
import { User } from '../../domain/User'
import { UserAlreadyExistsError } from '../errors/UserAlreadyExistsError'
import type { UserRepository } from '../ports/UserRepository'

export interface UpdateUserInput {
  userId: string
  name?: string
  email?: string
}

export class UpdateUser implements UseCase<UpdateUserInput, void> {
  constructor(private readonly userRepository: UserRepository) {}

  async execute(input: UpdateUserInput): Promise<void> {
    const user = await this.userRepository.findById(input.userId)
    if (!user) throw new NotFoundError(`User not found`)

    if (input.email) {
      if (input.email === user.getEmail().toString())
        throw new UserAlreadyExistsError(`Email ${input.email} is already in use`)

      const existingEmail = await this.userRepository.findByEmail(Email.create(input.email))
      if (existingEmail) throw new UserAlreadyExistsError(`Email ${input.email} is already in use`)
    }

    const updatedUser = User.rehydrate({
      ...user.toSnapshot(),
      ...(input.email === undefined ? {} : { email: input.email }),
      ...(input.name === undefined ? {} : { name: input.name }),
    })
    await this.userRepository.updateById(updatedUser)
  }
}
