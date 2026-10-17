import type {
	InputSessionDTO,
	SessionDAO,
	SessionDTO,
} from "@/infra/database/DAOs/SessionDAO";

export class SessionDAOFake implements SessionDAO {
	readonly db = new Map<string, SessionDTO>();
	async save(entity: InputSessionDTO): Promise<void> {
		if (this.db.has(entity.id)) throw new Error("Duplicate id");
		if ([...this.db.values()].some((row) => row.tokenHash === entity.tokenHash))
			throw new Error("Duplicate token hash");
		const now = new Date();
		this.db.set(entity.id, { ...entity, createdAt: now, updatedAt: now });
	}
	async update(entity: InputSessionDTO): Promise<void> {
		const existing = this.db.get(entity.id);
		if (
			existing &&
			[...this.db.values()].some(
				(row) => row.id !== entity.id && row.tokenHash === entity.tokenHash,
			)
		)
			throw new Error("Duplicate token hash");
		if (existing)
			this.db.set(entity.id, { ...existing, ...entity, updatedAt: new Date() });
	}
	async deleteById({ id }: Pick<SessionDTO, "id">): Promise<void> {
		this.db.delete(id);
	}
	async findById({ id }: Pick<SessionDTO, "id">): Promise<SessionDTO | null> {
		return this.db.get(id) ?? null;
	}
	async findByTokenHash({
		tokenHash: value,
	}: Pick<SessionDTO, "tokenHash">): Promise<SessionDTO | null> {
		return [...this.db.values()].find((row) => row.tokenHash === value) ?? null;
	}
}
