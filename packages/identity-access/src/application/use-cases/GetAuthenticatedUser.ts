import type { Clock, KeyedHasher, UseCase } from '@affiliate-hub/shared-kernel'
import { InvalidCredentialsError } from '../errors/InvalidCredentialsError'
import type { SessionRepository } from '../ports/SessionRepository'
import type { UserRepository } from '../ports/UserRepository'

export interface GetAuthenticatedUserInput {
  token: string
}

export interface GetAuthenticatedUserOutput {
  user: {
    id: string
    email: string
    name: string
  }
}

export class GetAuthenticatedUser
  implements UseCase<GetAuthenticatedUserInput, GetAuthenticatedUserOutput>
{
  constructor(
    private readonly userRepository: UserRepository,
    private readonly sessionRepository: SessionRepository,
    private readonly keyedHasher: KeyedHasher,
    private readonly clock: Clock,
  ) {}

  async execute(input: GetAuthenticatedUserInput): Promise<GetAuthenticatedUserOutput> {
    const tokenHash = await this.keyedHasher.hash(input.token)
    const session = await this.sessionRepository.findByTokenHash(tokenHash)
    if (!session || session.isExpired(this.clock.now()))
      throw new InvalidCredentialsError('Invalid session token')

    const user = await this.userRepository.findById(session.getUserId())
    if (!user) throw new InvalidCredentialsError('Invalid session token')
    return {
      user: {
        id: user.getId(),
        email: user.getEmail().toString(),
        name: user.getName(),
      },
    }
  }
}
