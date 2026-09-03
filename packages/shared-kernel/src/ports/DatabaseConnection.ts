export interface TransactionOptions {
  isolationLevel?: 'serializable'
  maxRetries?: number
}

export interface DatabaseConnection {
  query<Row = unknown>(sql: string, params?: unknown[]): Promise<Row[]>
  transaction<Result>(
    callback: (connection: DatabaseConnection) => Promise<Result>,
  ): Promise<Result>
  transaction<Result>(
    options: TransactionOptions,
    callback: (connection: DatabaseConnection) => Promise<Result>,
  ): Promise<Result>
}
