import { describe, expect, it } from 'bun:test'
import type {
  Cipher,
  DatabaseConnection,
  KeyedHasher,
  TransactionOptions,
} from '@affiliate-hub/shared-kernel'
import { UserRepositorySql } from '../../src/adapters/UserRepositorySQL'
import { Email } from '../../src/domain/Email'
import { User } from '../../src/domain/User'

function databaseWithResponses(responses: unknown[][]): {
  db: DatabaseConnection
  queries: Array<{ sql: string; params: unknown[] | undefined }>
} {
  const queries: Array<{ sql: string; params: unknown[] | undefined }> = []
  const db: DatabaseConnection = {
    query: async <Row>(sql: string, params?: unknown[]) => {
      queries.push({ sql, params })
      return (responses.shift() ?? []) as Row[]
    },
    transaction: async <Result>(
      optionsOrCallback: TransactionOptions | ((connection: DatabaseConnection) => Promise<Result>),
      maybeCallback?: (connection: DatabaseConnection) => Promise<Result>,
    ) => {
      const callback = typeof optionsOrCallback === 'function' ? optionsOrCallback : maybeCallback
      if (!callback) throw new Error('Transaction callback is required')
      return callback(db)
    },
  }

  return { db, queries }
}

const cipher: Cipher = {
  encrypt: async (plaintext) => ({
    ciphertext: `encrypted:${plaintext}`,
    iv: 'iv',
    authTag: 'tag',
  }),
  decrypt: async (ciphertext) => ciphertext.replace('encrypted:', ''),
}

const keyedHasher: KeyedHasher = {
  hash: async (value) => `hash:${value}`,
}

describe('UserRepositorySql', () => {
  it('returns null when no user has the requested email', async () => {
    const { db } = databaseWithResponses([[]])
    const repository = new UserRepositorySql(db, cipher, keyedHasher)

    await expect(repository.findByEmail(Email.create('missing@example.com'))).resolves.toBeNull()
  })

  it('updates persisted protected user fields by id', async () => {
    const { db, queries } = databaseWithResponses([[]])
    const repository = new UserRepositorySql(db, cipher, keyedHasher)
    const user = User.create('USER-1', {
      email: 'jane@example.com',
      name: 'Jane',
      passwordHash: 'password-hash',
    })

    await repository.updateById(user)

    expect(queries).toEqual([
      {
        sql: expect.stringContaining('update users set'),
        params: [
          'password-hash',
          'encrypted:jane@example.com',
          'iv',
          'tag',
          'hash:jane@example.com',
          'Jane',
          'USER-1',
        ],
      },
    ])
  })
})
