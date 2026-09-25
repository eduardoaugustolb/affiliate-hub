export interface DatabaseConnection {
	query(sql: string, params?: unknown[]): Promise<unknown>;
	transaction(): Promise<DatabaseConnection>;
	close(): Promise<void>;
}
