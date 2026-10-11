import { UserAlreadyExistsError } from "@/application/errors/UserAlreadyExistsError";
import type {
	InputUserDTO,
	UserDAO,
	UserDTO,
} from "@/infra/database/DAOs/UserDAO";
import type { DatabaseConnection } from "@/infra/database/DatabaseConnection";

export class UserDAOSQL implements UserDAO {
	constructor(private readonly connection: DatabaseConnection) {}
	async save(entity: InputUserDTO): Promise<void> {
		try {
			await this.connection.query(
				"INSERT INTO users (id, name, email, password_hash, role, created_at, updated_at) VALUES ($1, $2, $3, $4, $5, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)",
				[
					entity.id,
					entity.name,
					entity.email,
					entity.passwordHash,
					entity.role,
				],
			);
		} catch (error) {
			if (this.isDuplicateEmail(error)) throw new UserAlreadyExistsError();
			throw error;
		}
	}
	async update(entity: InputUserDTO): Promise<void> {
		try {
			await this.connection.query(
				"UPDATE users SET name = $1, email = $2, password_hash = $3, role = $4, updated_at = CURRENT_TIMESTAMP WHERE id = $5",
				[
					entity.name,
					entity.email,
					entity.passwordHash,
					entity.role,
					entity.id,
				],
			);
		} catch (error) {
			if (this.isDuplicateEmail(error)) throw new UserAlreadyExistsError();
			throw error;
		}
	}
	async deleteById(id: string): Promise<void> {
		await this.connection.query("DELETE FROM users WHERE id = $1", [id]);
	}
	async findById(value: string): Promise<UserDTO | null> {
		const rows = await this.connection.query<UserDTO>(
			'SELECT id, name, email, password_hash AS "passwordHash", role, created_at AS "createdAt", updated_at AS "updatedAt" FROM users WHERE id = $1',
			[value],
		);
		return rows[0] ?? null;
	}
	async findByEmail(value: string): Promise<UserDTO | null> {
		const rows = await this.connection.query<UserDTO>(
			'SELECT id, name, email, password_hash AS "passwordHash", role, created_at AS "createdAt", updated_at AS "updatedAt" FROM users WHERE email = $1',
			[value],
		);
		return rows[0] ?? null;
	}
	async findFirstAdmin(): Promise<UserDTO | null> {
		const rows = await this.connection.query<UserDTO>(
			'SELECT id, name, email, password_hash AS "passwordHash", role, created_at AS "createdAt", updated_at AS "updatedAt" FROM users WHERE role = $1 ORDER BY created_at ASC LIMIT 1',
			["admin"],
		);
		return rows[0] ?? null;
	}

	private isDuplicateEmail(error: unknown): boolean {
		return (
			typeof error === "object" &&
			error !== null &&
			"code" in error &&
			error.code === "23505" &&
			"constraint" in error &&
			error.constraint === "users_email_unique"
		);
	}
}
