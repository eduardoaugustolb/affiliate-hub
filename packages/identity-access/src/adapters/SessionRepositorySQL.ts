import type { Clock, DatabaseConnection } from '@affiliate-hub/shared-kernel'
import type { SessionRepository } from '../application/ports/SessionRepository'
import { Session } from '../domain/Session'

interface SessionRow {
  id: string
  token_hash: string
  user_id: string
  expires_at: Date
  created_at: Date
}

export class SessionRepositorySql implements SessionRepository {
  constructor(
    private readonly db: DatabaseConnection,
    private readonly clock: Clock,
  ) {}

  async deleteById(sessionId: string): Promise<void> {
    await this.db.query(`delete from sessions where id = $1`, [sessionId])
  }

  async deleteByTokenHash(tokenHash: string): Promise<void> {
    await this.db.query(`delete from sessions where token_hash = $1`, [tokenHash])
  }

  async listByUserId(userId: string): Promise<Session[] | null> {
    const result = (await this.db.query(
      'select id, token_hash, user_id, expires_at, created_at from sessions where user_id = $1',
      [userId],
    )) as SessionRow[]

    if (result.length === 0) return null
    const sessions = await Promise.all(
      result.map(async (row) => {
        if (row.expires_at && row.expires_at < this.clock.now()) {
          await this.deleteById(row.id)
          return
        }

        const session = Session.rehydrate({
          id: row.id,
          tokenHash: row.token_hash,
          userId: row.user_id,
          expiresAt: row.expires_at,
          createdAt: row.created_at,
        })
        return session
      }),
    )

    const activeSessions = sessions.filter((session): session is Session => session !== undefined)
    return activeSessions.length === 0 ? null : activeSessions
  }

  async findById(sessionId: string): Promise<Session | null> {
    const result = (await this.db.query(
      'select id, token_hash, user_id, expires_at, created_at from sessions where id = $1',
      [sessionId],
    )) as SessionRow[]

    if (result.length === 0) return null
    const row = result[0] as SessionRow

    if (row.expires_at && row.expires_at < this.clock.now()) {
      await this.deleteById(row.id)
      return null
    }

    return Session.rehydrate({
      id: row.id,
      tokenHash: row.token_hash,
      userId: row.user_id,
      expiresAt: row.expires_at,
      createdAt: row.created_at,
    })
  }

  async findByTokenHash(tokenHash: string): Promise<Session | null> {
    const result = (await this.db.query(
      'select id, token_hash, user_id, expires_at, created_at from sessions where token_hash = $1',
      [tokenHash],
    )) as SessionRow[]

    if (result.length === 0) return null
    const row = result[0] as SessionRow

    if (row.expires_at && row.expires_at < this.clock.now()) {
      await this.deleteById(row.id)
      return null
    }

    return Session.rehydrate({
      id: row.id,
      tokenHash: row.token_hash,
      userId: row.user_id,
      expiresAt: row.expires_at,
      createdAt: row.created_at,
    })
  }

  async save(session: Session): Promise<void> {
    await this.db.query(
      'insert into sessions (id, token_hash, user_id, expires_at, created_at) values ($1, $2, $3, $4, $5)',
      [
        session.getId(),
        session.getTokenHash(),
        session.getUserId(),
        session.getExpiresAt(),
        session.getCreatedAt(),
      ],
    )
  }
}
