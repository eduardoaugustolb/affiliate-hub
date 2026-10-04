export type SessionDTO = {
	id: string;
	userId: string;
	tokenHash: string;
	expiresAt: Date;
	revokedAt: Date | null;
	createdAt: Date;
	updatedAt: Date;
};
export type InputSessionDTO = Omit<SessionDTO, "createdAt" | "updatedAt">;
export interface SessionDAO {
	save(entity: InputSessionDTO): Promise<void>;
	update(entity: InputSessionDTO): Promise<void>;
	deleteById(id: string): Promise<void>;
	findById(id: string): Promise<SessionDTO | null>;
	findByTokenHash(value: string): Promise<SessionDTO | null>;
}
