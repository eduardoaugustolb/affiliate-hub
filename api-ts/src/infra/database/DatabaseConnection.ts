/** Queries return rows directly; adapters normalize driver-specific result objects. */
export interface DatabaseConnection {
	query<T = Record<string, unknown>>(
		sql: string,
		params?: unknown[],
	): Promise<T[]>;
	transaction(): Promise<DatabaseTransaction>;
	close(): Promise<void>;
}

export interface DatabaseTransaction
	extends Omit<DatabaseConnection, "transaction" | "close"> {
	commit(): Promise<void>;
	rollback(): Promise<void>;
}
