import type { UseCase } from '@affiliate-hub/shared-kernel'
import type { UserRepository } from '../ports/UserRepository'

export interface DeleteUserInput {
  userId: string
}

export class DeleteUser implements UseCase<DeleteUserInput, void> {
  constructor(private readonly userRepository: UserRepository) {}

  async execute(input: DeleteUserInput): Promise<void> {
    await this.userRepository.deleteById(input.userId)
  }
}
