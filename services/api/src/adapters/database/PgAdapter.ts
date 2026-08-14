import type { DatabaseConnection } from '@affiliate-hub/shared-kernel'
import { SQL as SQLClient } from 'bun'

export class PgAdapter implements DatabaseConnection {
  private readonly sql: SQLClient

  constructor(connectionString: string) {
    this.sql = new SQLClient(connectionString)
  }

  async query<Row = unknown>(sql: string, params: unknown[] = []): Promise<Row[]> {
    const resultado = await this.sql.unsafe(sql, params as never[])
    return resultado as unknown as Row[]
  }

  async transaction<Result>(
    callback: (connection: DatabaseConnection) => Promise<Result>,
  ): Promise<Result> {
    return this.sql.begin(async (transaction) => callback(this.asConnection(transaction)))
  }

  private asConnection(sql: SQLClient): DatabaseConnection {
    return {
      query: async <Row = unknown>(query: string, params: unknown[] = []): Promise<Row[]> => {
        const resultado = await sql.unsafe(query, params as never[])
        return resultado as unknown as Row[]
      },
      transaction: async <Result>(callback: (connection: DatabaseConnection) => Promise<Result>) =>
        sql.begin(async (transaction) => callback(this.asConnection(transaction))),
    }
  }

  async close(): Promise<void> {
    await this.sql.end()
  }
}
