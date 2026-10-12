import { createInterface } from "node:readline/promises";
import { SQL } from "bun";
import { CreateFirstAdmin } from "@/application/usecases/commands/CreateFirstAdmin";
import { UserDAOSQL } from "@/external/database/DAOs/UserDAOSQL";
import { BunPasswordHasher } from "@/external/hash/BunPasswordHasher";
import type { DatabaseConnection } from "@/infra/database/DatabaseConnection";
import { UserRepositoryDatabase } from "@/infra/database/repositories/UserRepositoryDatabase";

const { DATABASE_URL } = process.env;
if (!DATABASE_URL) {
	throw new Error("DATABASE_URL is required");
}

const terminal = createInterface({
	input: process.stdin,
	output: process.stdout,
});
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
	const name = (await terminal.question("Admin name: ")).trim();
	const email = (await terminal.question("Admin email: ")).trim();
	const password = await terminal.question("Admin password: ");
	if (!name || !email || !password) {
		throw new Error("Admin name, email, and password are required");
	}

	const repository = new UserRepositoryDatabase(new UserDAOSQL(connection), {
		generate: () => crypto.randomUUID(),
	});
	await new CreateFirstAdmin(repository, new BunPasswordHasher()).execute(
		undefined,
		{ name, email, password },
	);
} finally {
	terminal.close();
	await connection.close();
}
