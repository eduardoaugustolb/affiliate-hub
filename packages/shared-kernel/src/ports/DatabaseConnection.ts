export interface DatabaseConnection {
  query<Row = unknown>(sql: string, params?: unknown[]): Promise<Row[]>
}
