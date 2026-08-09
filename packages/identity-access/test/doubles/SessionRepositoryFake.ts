import type { SessionRepository } from '../../src/application/ports/SessionRepository'
import type { Session } from '../../src/domain/Session'

export class SessionRepositoryFake implements SessionRepository {
  private readonly sessions = new Map<string, Session>()

  async save(session: Session): Promise<void> {
    this.sessions.set(session.getId(), session)
  }

  async findById(sessionId: string): Promise<Session | undefined> {
    return this.sessions.get(sessionId)
  }

  async deleteById(sessionId: string): Promise<void> {
    this.sessions.delete(sessionId)
  }

  async findByUserId(userId: string): Promise<Session[] | undefined> {
    return [...this.sessions.values()].filter((session) => session.getUserId() === userId)
  }

  async findByTokenHash(tokenHash: string): Promise<Session | undefined> {
    return [...this.sessions.values()].find((session) => session.getTokenHash() === tokenHash)
  }
}
