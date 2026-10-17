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
	deleteById(input: Pick<SessionDTO, "id">): Promise<void>;
	findById(input: Pick<SessionDTO, "id">): Promise<SessionDTO | null>;
	findByTokenHash(
		input: Pick<SessionDTO, "tokenHash">,
	): Promise<SessionDTO | null>;
}
