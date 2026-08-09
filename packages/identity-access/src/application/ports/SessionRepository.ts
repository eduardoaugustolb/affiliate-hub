import type { Session } from '../../domain/Session'

export interface SessionRepository {
  save(session: Session): Promise<void>
  findById(sessionId: string): Promise<Session | undefined>
  deleteById(sessionId: string): Promise<void>
  findByUserId(userId: string): Promise<Session[] | undefined>
  findByTokenHash(tokenHash: string): Promise<Session | undefined>
}
