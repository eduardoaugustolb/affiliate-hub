import type { DatabaseConnection } from '@affiliate-hub/shared-kernel'
import { SQL as SQLClient } from 'bun'

export class PgAdapter implements DatabaseConnection {
  private sql: SQLClient

  constructor(connection: string | SQLClient) {
    this.sql = typeof connection === 'string' ? new SQLClient(connection) : connection
  }

  async query<Row = unknown>(query: string, params: unknown[] = []) {
    return (await this.sql.unsafe(query, params as never[])) as unknown as Row[]
  }

  async transaction<Result>(
    callback: (connection: DatabaseConnection) => Promise<Result>,
  ): Promise<Result> {
    return this.sql.begin(async (transaction) => callback(new PgAdapter(transaction)))
  }

  async connect(): Promise<void> {
    this.sql = await this.sql.connect()
    console.log('Postgres connection is ready!')
  }

  async close(): Promise<void> {
    await this.sql.end()
    console.log('Postgres connection is closed!')
  }
}
