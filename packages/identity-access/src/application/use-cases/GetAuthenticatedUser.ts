import type { UseCase } from '@affiliate-hub/shared-kernel'
import type { User } from '../../domain/User'
import { InvalidCredentialsError } from '../errors/InvalidCredentialsError'
import type { SessionRepository } from '../ports/SessionRepository'
import type { TokenHasher } from '../ports/TokenHasher'
import type { UserRepository } from '../ports/UserRepository'

export interface GetAuthenticatedUserInput {
  token: string
}

export interface GetAuthenticatedUserOutput {
  user: User
}

export class GetAuthenticatedUser
  implements UseCase<GetAuthenticatedUserInput, GetAuthenticatedUserOutput>
{
  constructor(
    private readonly userRepository: UserRepository,
    private readonly sessionRepository: SessionRepository,
    private readonly tokenHasher: TokenHasher,
  ) {}

  async execute(input: GetAuthenticatedUserInput): Promise<GetAuthenticatedUserOutput> {
    const tokenHash = this.tokenHasher.hash(input.token)
    const session = await this.sessionRepository.findByTokenHash(tokenHash)
    if (!session || session.isExpired()) throw new InvalidCredentialsError('Invalid session token')

    const user = await this.userRepository.findById(session.getUserId())
    if (!user) throw new InvalidCredentialsError('Invalid session token')
    return { user }
  }
}
