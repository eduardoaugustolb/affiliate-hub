import type { Session } from '../../domain/Session'

export interface SessionRepository {
  save(session: Session): Promise<void>
  findById(sessionId: string): Promise<Session | null>
  deleteById(sessionId: string): Promise<void>
  deleteByTokenHash(tokenHash: string): Promise<void>
  listByUserId(userId: string): Promise<Session[] | null>
  findByTokenHash(tokenHash: string): Promise<Session | null>
}
