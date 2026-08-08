import type { UseCase } from '@affiliate-hub/shared-kernel'
import type { UserRepository } from '../ports/UserRepository'

export interface AuthenticateUserInput {
  email: string
  password: string
}

export interface AuthenticateUserOutput {
  token: string
}

export class AuthenticateUser implements UseCase<AuthenticateUserInput, AuthenticateUserOutput> {
  constructor(
    private readonly userRepository: UserRepository,
    private readonly,
  ) {}
}
