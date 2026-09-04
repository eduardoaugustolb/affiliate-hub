import type { IdGenerator, KeyedHasher, UseCase } from '@affiliate-hub/shared-kernel'
import { Session } from '../../domain/Session'
import { User } from '../../domain/User'
import { InitialSetupAlreadyCompletedError } from '../errors/InitialSetupAlreadyCompletedError'
import type { IdentityAccessUnitOfWork } from '../ports/IdentityAccessUnitOfWork'
import type { PasswordHasher } from '../ports/PasswordHasher'
import type { TokenGenerator } from '../ports/TokenGenerator'

export interface SetupInitialUserInput {
  name: string
  email: string
  password: string
}

interface SetupInitialUserOutput {
  token: string
}

export class SetupInitialUser implements UseCase<SetupInitialUserInput, SetupInitialUserOutput> {
  constructor(
    private unitOfWork: IdentityAccessUnitOfWork,
    private idGenerator: IdGenerator,
    private passwordHasher: PasswordHasher,
    private tokenGenerator: TokenGenerator,
    private keyedHasher: KeyedHasher,
  ) {}

  async execute(input: SetupInitialUserInput): Promise<SetupInitialUserOutput> {
    return await this.unitOfWork.serializable(async (scope) => {
      const { users } = scope
      if (await users.hasAnyUser()) {
        throw new InitialSetupAlreadyCompletedError()
      }

      const userId = this.idGenerator.generate()
      const passwordHash = await this.passwordHasher.hash(input.password)

      const user = User.create(userId, {
        email: input.email,
        name: input.name,
        passwordHash,
      })

      await users.save(user)

      const sessionId = this.idGenerator.generate()

      const token = this.tokenGenerator.generate()
      const tokenHash = await this.keyedHasher.hash(token)

      const session = Session.create(sessionId, {
        tokenHash,
        userId,
        // 20 days
        expiresAt: new Date(Date.now() + 3600000 * 24 * 20),
      })

      await scope.sessions.save(session)

      return { token }
    })
  }
}
