import type { IdGenerator } from "@/application/IdGenerator";
import type { SessionRepository } from "@/application/repositories/SessionRepository";
import { Session } from "@/domain/entities/Session";
import type { DateProvider } from "@/infra/DateProvider";
import type { SessionDAO } from "../DAOs/SessionDAO";
export class SessionRepositorySQL implements SessionRepository {
	constructor(
		private readonly dao: SessionDAO,
		private readonly idGenerator: IdGenerator,
		private readonly dateProvider: DateProvider,
	) {}
	async findById(value: string): Promise<Session | null> {
		const row = await this.dao.findById(value);
		return row
			? Session.rehydrate(
					row.id,
					row.expiresAt,
					row.revokedAt,
					row.userId,
					row.tokenHash,
					this.dateProvider,
				)
			: null;
	}
	async findByTokenHash(value: string): Promise<Session | null> {
		const row = await this.dao.findByTokenHash(value);
		return row
			? Session.rehydrate(
					row.id,
					row.expiresAt,
					row.revokedAt,
					row.userId,
					row.tokenHash,
					this.dateProvider,
				)
			: null;
	}
	async save(entity: Session): Promise<void> {
		await this.dao.save({
			id: entity.getId() || this.idGenerator.generate(),
			userId: entity.getUserId(),
			tokenHash: entity.getTokenHash(),
			expiresAt: entity.getExpiresAt(),
			revokedAt: entity.getRevokedAt(),
		});
	}
	async update(entity: Session): Promise<void> {
		if (!entity.getId()) throw new Error("Cannot update session without an id");
		await this.dao.update({
			id: entity.getId() || this.idGenerator.generate(),
			userId: entity.getUserId(),
			tokenHash: entity.getTokenHash(),
			expiresAt: entity.getExpiresAt(),
			revokedAt: entity.getRevokedAt(),
		});
	}
	async deleteById(id: string): Promise<void> {
		await this.dao.deleteById(id);
	}
}
