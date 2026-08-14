export interface DatabaseConnection {
  query<Row = unknown>(sql: string, params?: unknown[]): Promise<Row[]>
  transaction<Result>(
    callback: (connection: DatabaseConnection) => Promise<Result>,
  ): Promise<Result>
}
