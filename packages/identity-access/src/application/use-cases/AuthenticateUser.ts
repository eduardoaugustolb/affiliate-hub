import type { IdGenerator, KeyedHasher, UseCase } from '@affiliate-hub/shared-kernel'
import { Email } from '../../domain/Email'
import { Session } from '../../domain/Session'
import { InvalidCredentialsError } from '../errors/InvalidCredentialsError'
import type { PasswordHasher } from '../ports/PasswordHasher'
import type { SessionRepository } from '../ports/SessionRepository'
import type { TokenGenerator } from '../ports/TokenGenerator'
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
    private readonly sessionRepository: SessionRepository,
    private readonly passwordHasher: PasswordHasher,
    private readonly tokenGenerator: TokenGenerator,
    private readonly keyedHasher: KeyedHasher,
    private readonly idGenerator: IdGenerator,
  ) {}

  async execute(input: AuthenticateUserInput): Promise<AuthenticateUserOutput> {
    const user = await this.userRepository.findByEmail(Email.create(input.email))
    if (!user) throw new InvalidCredentialsError('Invalid credentials')
    const isPasswordValid = await this.passwordHasher.verify(input.password, user.getPasswordHash())
    if (!isPasswordValid) throw new InvalidCredentialsError('Invalid credentials')

    const sessionId = this.idGenerator.generate()
    const token = this.tokenGenerator.generate()
    const hashedToken = await this.keyedHasher.hash(token)
    const expiresAtTimestamp = Date.now() + 20 * 24 * 60 * 60 * 1000

    await this.sessionRepository.save(
      Session.create(sessionId, {
        tokenHash: hashedToken,
        userId: user.getId(),
        expiresAt: new Date(expiresAtTimestamp),
      }),
    )
    return { token }
  }
}
