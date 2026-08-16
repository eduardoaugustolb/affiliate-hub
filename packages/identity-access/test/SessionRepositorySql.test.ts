import { describe, expect, it } from 'bun:test'
import type { DatabaseConnection } from '@affiliate-hub/shared-kernel'
import { SessionRepositorySql } from '../src/adapters/SessionRepositorySQL'
import { Session } from '../src/domain/Session'

interface QueryCall {
  sql: string
  params: unknown[] | undefined
}

function databaseWithResponses(responses: unknown[][]): {
  db: DatabaseConnection
  calls: QueryCall[]
} {
  const calls: QueryCall[] = []
  const db: DatabaseConnection = {
    query: async <Row>(sql: string, params?: unknown[]) => {
      calls.push({ sql, params })
      return (responses.shift() ?? []) as Row[]
    },
    transaction: async <Result>(callback: (connection: DatabaseConnection) => Promise<Result>) =>
      callback(db),
  }

  return { db, calls }
}

describe('SessionRepositorySql', () => {
  it('saves sessions and deletes them by id or token hash', async () => {
    const { db, calls } = databaseWithResponses([[], [], []])
    const repository = new SessionRepositorySql(db)
    const session = Session.create('SESSION-1', {
      tokenHash: 'token-hash',
      userId: 'USER-1',
      expiresAt: new Date('2026-08-20T12:00:00.000Z'),
    })

    await repository.save(session)
    await repository.deleteById('SESSION-1')
    await repository.deleteByTokenHash('token-hash')

    expect(calls.map((call) => call.sql)).toEqual([
      expect.stringContaining('insert into sessions'),
      expect.stringContaining('delete from sessions where id'),
      expect.stringContaining('delete from sessions where token_hash'),
    ])
  })

  it('returns null when an id or token hash does not match a session', async () => {
    const { db } = databaseWithResponses([[], []])
    const repository = new SessionRepositorySql(db)

    await expect(repository.findById('missing')).resolves.toBeNull()
    await expect(repository.findByTokenHash('missing')).resolves.toBeNull()
  })

  it('removes expired sessions and does not return them in a user list', async () => {
    const { db, calls } = databaseWithResponses([
      [
        {
          id: 'EXPIRED-1',
          token_hash: 'expired-hash',
          user_id: 'USER-1',
          expires_at: new Date('2026-08-01T12:00:00.000Z'),
        },
      ],
      [],
    ])
    const repository = new SessionRepositorySql(db)

    await expect(repository.listByUserId('USER-1')).resolves.toBeNull()

    expect(calls[1]?.sql).toContain('delete from sessions where id')
    expect(calls[1]?.params).toEqual(['EXPIRED-1'])
  })

  it('rehydrates an active session found by id', async () => {
    const expiresAt = new Date('2026-08-20T12:00:00.000Z')
    const { db } = databaseWithResponses([
      [{ id: 'SESSION-1', token_hash: 'token-hash', user_id: 'USER-1', expires_at: expiresAt }],
    ])
    const repository = new SessionRepositorySql(db)

    const session = await repository.findById('SESSION-1')

    expect(session?.toSnapshot()).toMatchObject({
      id: 'SESSION-1',
      tokenHash: 'token-hash',
      userId: 'USER-1',
      expiresAt,
    })
  })
})
