import type { KeyedHasher, UseCase } from '@affiliate-hub/shared-kernel'
import type { SessionRepository } from '../ports/SessionRepository'

export interface LogoutInput {
  token: string
}

export type LogoutOutput = undefined

export class Logout implements UseCase<LogoutInput, LogoutOutput> {
  constructor(
    private readonly sessionRepository: SessionRepository,
    private readonly keyedHasher: KeyedHasher,
  ) {}

  async execute(input: LogoutInput): Promise<LogoutOutput> {
    const tokenHash = await this.keyedHasher.hash(input.token)
    await this.sessionRepository.deleteByTokenHash(tokenHash)
  }
}
