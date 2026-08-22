import { describe, expect, it } from 'bun:test'
import type { SQL as SQLClient } from 'bun'
import { PgAdapter } from '../../../src/adapters/database/PgAdapter'

interface SqlClientFake {
  begin: (...args: unknown[]) => Promise<unknown>
  unsafe: () => Promise<unknown[]>
}

function sqlClientThatFailsWithSerializationError(times: number): {
  client: SQLClient
  beginArguments: unknown[][]
} {
  const beginArguments: unknown[][] = []
  let failuresRemaining = times
  const fake: SqlClientFake = {
    begin: async (...args) => {
      beginArguments.push(args)
      if (failuresRemaining > 0) {
        failuresRemaining -= 1
        throw Object.assign(new Error('serialization failure'), { code: '40001' })
      }

      const callback = (typeof args[0] === 'function' ? args[0] : args[1]) as (
        transaction: SQLClient,
      ) => Promise<unknown>
      return callback(fake as unknown as SQLClient)
    },
    unsafe: async () => [],
  }

  return { client: fake as unknown as SQLClient, beginArguments }
}

describe('PgAdapter transactions', () => {
  it('retries a serializable transaction after a PostgreSQL serialization failure', async () => {
    const { client, beginArguments } = sqlClientThatFailsWithSerializationError(1)
    const adapter = new PgAdapter(client)
    let executions = 0

    const result = await adapter.transaction(
      { isolationLevel: 'serializable', maxRetries: 2 },
      async () => {
        executions += 1
        return 'committed'
      },
    )

    expect(result).toBe('committed')
    expect(executions).toBe(1)
    expect(beginArguments).toHaveLength(2)
    expect(beginArguments.map((args) => args[0])).toEqual([
      'isolation level serializable',
      'isolation level serializable',
    ])
  })

  it('propagates a serialization failure after the retry limit', async () => {
    const { client, beginArguments } = sqlClientThatFailsWithSerializationError(3)
    const adapter = new PgAdapter(client)

    await expect(
      adapter.transaction({ isolationLevel: 'serializable', maxRetries: 1 }, async () => 'never'),
    ).rejects.toMatchObject({ code: '40001' })

    expect(beginArguments).toHaveLength(2)
  })

  it('does not retry a standard transaction after a serialization failure', async () => {
    const { client, beginArguments } = sqlClientThatFailsWithSerializationError(1)
    const adapter = new PgAdapter(client)

    await expect(adapter.transaction(async () => 'never')).rejects.toMatchObject({ code: '40001' })

    expect(beginArguments).toHaveLength(1)
  })
})
