import type { Cipher, Clock, DatabaseConnection, KeyedHasher } from '@affiliate-hub/shared-kernel'
import type {
  IdentityAccessTransactionScope,
  IdentityAccessUnitOfWork,
} from '../application/ports/IdentityAccessUnitOfWork'
import { SessionRepositorySql } from './SessionRepositorySQL'
import { UserRepositorySql } from './UserRepositorySQL'

export class IdentityAccessUnitOfWorkSql implements IdentityAccessUnitOfWork {
  constructor(
    private readonly connection: DatabaseConnection,
    private readonly cipher: Cipher,
    private readonly keyedHasher: KeyedHasher,
    private readonly clock: Clock,
  ) {}

  async serializable<T>(
    callback: (scope: IdentityAccessTransactionScope) => Promise<T>,
  ): Promise<T> {
    return await this.connection.transaction(
      { isolationLevel: 'serializable', maxRetries: 2 },
      async (tx) => {
        const userRepository = new UserRepositorySql(tx, this.cipher, this.keyedHasher)
        const sessionRepository = new SessionRepositorySql(tx, this.clock)
        const scope: IdentityAccessTransactionScope = {
          users: userRepository,
          sessions: sessionRepository,
          clock: this.clock,
        }

        return await callback(scope)
      },
    )
  }
}
