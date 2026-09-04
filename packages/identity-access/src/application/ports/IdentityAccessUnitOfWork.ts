import type { SessionRepository } from './SessionRepository'
import type { UserRepository } from './UserRepository'

export interface IdentityAccessUnitOfWork {
  serializable<T>(callback: (scope: IdentityAccessTransactionScope) => Promise<T>): Promise<T>
}

export interface IdentityAccessTransactionScope {
  users: UserRepository
  sessions: SessionRepository
}
