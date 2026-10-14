import type { DatabaseConnection } from "@/infra/database/DatabaseConnection";
export class DatabaseConnectionFake implements DatabaseConnection {
	readonly queries: { sql: string; params: unknown[] }[] = [];
	rows: unknown[] = [];
	error: unknown;
	async query<T = Record<string, unknown>>(
		sql: string,
		params: unknown[] = [],
	): Promise<T[]> {
		this.queries.push({ sql, params });
		if (this.error !== undefined) throw this.error;
		return this.rows as T[];
	}
	lastQuery(): { sql: string; params: unknown[] } {
		const query = this.queries.at(-1);
		if (!query) throw new Error("No query recorded");
		return query;
	}
	async transaction(): Promise<DatabaseConnection> {
		return this;
	}
	async close(): Promise<void> {}
}
