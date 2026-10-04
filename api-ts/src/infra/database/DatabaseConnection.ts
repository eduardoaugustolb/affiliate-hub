/** Queries return rows directly; adapters normalize driver-specific result objects. */
export interface DatabaseConnection {
	query<T = Record<string, unknown>>(
		sql: string,
		params?: unknown[],
	): Promise<T[]>;
	transaction(): Promise<DatabaseConnection>;
	close(): Promise<void>;
}
