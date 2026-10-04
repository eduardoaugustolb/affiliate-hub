import type {
	InputSessionDTO,
	SessionDAO,
	SessionDTO,
} from "@/infra/database/DAOs/SessionDAO";
import type { DatabaseConnection } from "@/infra/database/DatabaseConnection";

export class SessionDAOSQL implements SessionDAO {
	constructor(private readonly connection: DatabaseConnection) {}
	async save(entity: InputSessionDTO): Promise<void> {
		await this.connection.query(
			"INSERT INTO sessions (id, user_id, token_hash, expires_at, revoked_at, created_at, updated_at) VALUES ($1, $2, $3, $4, $5, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)",
			[
				entity.id,
				entity.userId,
				entity.tokenHash,
				entity.expiresAt,
				entity.revokedAt,
			],
		);
	}
	async update(entity: InputSessionDTO): Promise<void> {
		await this.connection.query(
			"UPDATE sessions SET user_id = $1, token_hash = $2, expires_at = $3, revoked_at = $4, updated_at = CURRENT_TIMESTAMP WHERE id = $5",
			[
				entity.userId,
				entity.tokenHash,
				entity.expiresAt,
				entity.revokedAt,
				entity.id,
			],
		);
	}
	async deleteById(id: string): Promise<void> {
		await this.connection.query("DELETE FROM sessions WHERE id = $1", [id]);
	}
	async findById(value: string): Promise<SessionDTO | null> {
		const rows = await this.connection.query<SessionDTO>(
			'SELECT id, user_id AS "userId", token_hash AS "tokenHash", expires_at AS "expiresAt", revoked_at AS "revokedAt", created_at AS "createdAt", updated_at AS "updatedAt" FROM sessions WHERE id = $1',
			[value],
		);
		return rows[0] ?? null;
	}
	async findByTokenHash(value: string): Promise<SessionDTO | null> {
		const rows = await this.connection.query<SessionDTO>(
			'SELECT id, user_id AS "userId", token_hash AS "tokenHash", expires_at AS "expiresAt", revoked_at AS "revokedAt", created_at AS "createdAt", updated_at AS "updatedAt" FROM sessions WHERE token_hash = $1',
			[value],
		);
		return rows[0] ?? null;
	}
}
