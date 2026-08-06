import type { DatabaseConnection } from '@affiliate-hub/shared-kernel'
import {SQL as SQLClient} from "bun"

export class PgAdapter implements DatabaseConnection {
  private readonly sql: SQLClient

  constructor(connectionString: string) {
    this.sql = new SQLClient(connectionString)
  }

  async query<Row = unknown>(sql: string, params: unknown[] = []): Promise<Row[]> {
    const resultado = await this.sql.unsafe(sql, params as never[])
    return resultado as unknown as Row[]
  }

  async close(): Promise<void> {
    await this.sql.end()
  }
}
