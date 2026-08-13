import type { SessionRepository } from '../../src/application/ports/SessionRepository'
import type { Session } from '../../src/domain/Session'

export class SessionRepositoryFake implements SessionRepository {
  private readonly sessions = new Map<string, Session>()

  async save(session: Session): Promise<void> {
    this.sessions.set(session.getId(), session)
  }

  async findById(sessionId: string): Promise<Session | null> {
    const session = this.sessions.get(sessionId)
    if (!session) return null
    if (session.isExpired()) {
      await this.deleteById(sessionId)
      return null
    }
    return session
  }

  async deleteById(sessionId: string): Promise<void> {
    this.sessions.delete(sessionId)
  }

  async listByUserId(userId: string): Promise<Session[] | null> {
    const sessions: Session[] = []
    for (const session of this.sessions.values()) {
      if (session.getUserId() !== userId) continue
      if (session.isExpired()) {
        await this.deleteById(session.getId())
        continue
      }
      sessions.push(session)
    }
    return sessions.length === 0 ? null : sessions
  }

  async findByTokenHash(tokenHash: string): Promise<Session | null> {
    const session = [...this.sessions.values()].find(
      (candidate) => candidate.getTokenHash() === tokenHash,
    )
    if (!session) return null
    if (session.isExpired()) {
      await this.deleteById(session.getId())
      return null
    }
    return session
  }

  async deleteByTokenHash(tokenHash: string): Promise<void> {
    const session = await this.findByTokenHash(tokenHash)
    if (session) this.sessions.delete(session.getId())
  }

  async updateById(sessionId: string, session: Session): Promise<void> {
    this.sessions.set(sessionId, session)
  }
}
