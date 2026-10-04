import type { Session } from "@/domain/entities/Session";

export interface SessionRepository {
	findById(id: string): Promise<Session | null>;
	findByTokenHash(tokenHash: string): Promise<Session | null>;
	save(session: Session): Promise<void>;
	deleteById(id: string): Promise<void>;
	update(session: Session): Promise<void>;
}
