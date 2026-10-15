import { type ReservedSQL, SQL } from "bun";
import type {
	DatabaseConnection,
	DatabaseTransaction,
} from "@/infra/database/DatabaseConnection";

export type BunSQLAdapterOptions = {
	dbUrl: string;
	database?: string;
};

export class BunSQLAdapter implements DatabaseConnection {
	conn: SQL;

	constructor({ dbUrl, database }: BunSQLAdapterOptions) {
		this.conn = new SQL({
			url: dbUrl,
			database,
			onclose: (err) => {
				console.error("Database Connection is closed", err?.message);
			},
		});
	}

	async close(): Promise<void> {
		await this.conn.close();
	}

	async transaction(): Promise<DatabaseTransaction> {
		const conn = await this.conn.reserve();
		try {
			await conn.unsafe("BEGIN");
			return new BunSQLTransaction(conn);
		} catch (error) {
			conn.release();
			throw error;
		}
	}

	async query<T = Record<string, unknown>>(
		sql: string,
		params: unknown[] = [],
	): Promise<T[]> {
		return await this.conn.unsafe<T[]>(sql, params);
	}
}

class BunSQLTransaction implements DatabaseTransaction {
	private closed = false;

	constructor(private readonly conn: ReservedSQL) {}

	async query<T = Record<string, unknown>>(
		sql: string,
		params: unknown[] = [],
	): Promise<T[]> {
		if (this.closed) throw new Error("Transaction connection is closed");
		return await this.conn.unsafe<T[]>(sql, params);
	}

	async commit(): Promise<void> {
		await this.finish("COMMIT");
	}

	async rollback(): Promise<void> {
		await this.finish("ROLLBACK");
	}

	private async finish(command: "COMMIT" | "ROLLBACK"): Promise<void> {
		if (this.closed) throw new Error("Transaction connection is closed");
		this.closed = true;
		try {
			await this.conn.unsafe(command);
		} finally {
			this.conn.release();
		}
	}
}
