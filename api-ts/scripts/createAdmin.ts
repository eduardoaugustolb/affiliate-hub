import { SQL } from "bun";
import { CreateFirstAdmin } from "@/application/usecases/commands/CreateFirstAdmin";
import { UserDAOSQL } from "@/external/database/DAOs/UserDAOSQL";
import { BunPasswordHasher } from "@/external/hash/BunPasswordHasher";
import type { DatabaseConnection } from "@/infra/database/DatabaseConnection";
import { UserRepositoryDatabase } from "@/infra/database/repositories/UserRepositoryDatabase";

const { DATABASE_URL, ADMIN_NAME, ADMIN_EMAIL, ADMIN_PASSWORD } = process.env;
if (!DATABASE_URL || !ADMIN_NAME || !ADMIN_EMAIL || !ADMIN_PASSWORD) {
	throw new Error(
		"DATABASE_URL, ADMIN_NAME, ADMIN_EMAIL, and ADMIN_PASSWORD are required",
	);
}

const sql = new SQL(DATABASE_URL);
const connection: DatabaseConnection = {
	async query<T>(statement: string, params: unknown[] = []): Promise<T[]> {
		return await sql.unsafe<T[]>(statement, params);
	},
	async transaction(): Promise<DatabaseConnection> {
		throw new Error("This script does not support database transactions");
	},
	close: () => sql.close(),
};

try {
	const repository = new UserRepositoryDatabase(new UserDAOSQL(connection), {
		generate: () => crypto.randomUUID(),
	});
	await new CreateFirstAdmin(repository, new BunPasswordHasher()).execute(
		undefined,
		{ name: ADMIN_NAME, email: ADMIN_EMAIL, password: ADMIN_PASSWORD },
	);
} finally {
	await connection.close();
}
