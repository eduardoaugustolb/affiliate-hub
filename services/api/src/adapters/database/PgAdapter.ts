import type { DatabaseConnection, TransactionOptions } from '@affiliate-hub/shared-kernel'
import { SQL as SQLClient } from 'bun'

export class PgAdapter implements DatabaseConnection {
  private sql: SQLClient

  constructor(connection: string | SQLClient) {
    this.sql = typeof connection === 'string' ? new SQLClient(connection) : connection
  }

  async query<Row = unknown>(query: string, params: unknown[] = []): Promise<Row[]> {
    return (await this.sql.unsafe(query, params as never[])) as unknown as Row[]
  }

  async transaction<Result>(
    optionsOrCallback: TransactionOptions | ((connection: DatabaseConnection) => Promise<Result>),
    maybeCallback?: (connection: DatabaseConnection) => Promise<Result>,
  ): Promise<Result> {
    const options = typeof optionsOrCallback === 'function' ? {} : optionsOrCallback
    const callback = typeof optionsOrCallback === 'function' ? optionsOrCallback : maybeCallback

    if (!callback) throw new Error('Transaction callback is required')

    const attempts = (options.maxRetries ?? 0) + 1
    for (let attempt = 1; attempt <= attempts; attempt += 1) {
      try {
        const execute = (transaction: SQLClient) => callback(new PgAdapter(transaction))
        if (options.isolationLevel === 'serializable') {
          return await this.sql.begin('isolation level serializable', execute)
        }
        return await this.sql.begin(execute)
      } catch (error) {
        const canRetry =
          options.isolationLevel === 'serializable' &&
          this.isSerializationFailure(error) &&
          attempt < attempts
        if (!canRetry) throw error
      }
    }

    throw new Error('Unreachable transaction state')
  }

  private isSerializationFailure(error: unknown): boolean {
    return typeof error === 'object' && error !== null && 'code' in error && error.code === '40001'
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
