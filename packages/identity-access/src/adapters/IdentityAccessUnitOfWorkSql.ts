import type { Cipher, DatabaseConnection, KeyedHasher } from '@affiliate-hub/shared-kernel'
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
  ) {}

  async serializable<T>(
    callback: (scope: IdentityAccessTransactionScope) => Promise<T>,
  ): Promise<T> {
    return await this.connection.transaction(
      { isolationLevel: 'serializable', maxRetries: 2 },
      async (tx) => {
        const userRepository = new UserRepositorySql(tx, this.cipher, this.keyedHasher)
        const sessionRepository = new SessionRepositorySql(tx)
        const scope: IdentityAccessTransactionScope = {
          users: userRepository,
          sessions: sessionRepository,
        }

        return await callback(scope)
      },
    )
  }
}
