import { OutboxEventDeliveryRepositorySql } from '@affiliate-hub/affiliate-sync'
import { IdGeneratorBun } from '../adapters/crypto/IdGeneratorBun'
import { PgAdapter } from '../adapters/database/PgAdapter'
import { env } from '../env'
import { createAffiliateProductImportWorker } from './createAffiliateProductImportWorker'
import { handleAffiliateProductImportRequested } from './handlers/handleAffiliateProductImportRequested'

async function main(): Promise<void> {
  const db = new PgAdapter(env.DATABASE_URL)
  const worker = createAffiliateProductImportWorker(
    new OutboxEventDeliveryRepositorySql(db),
    handleAffiliateProductImportRequested(db, new IdGeneratorBun()),
  )

  await worker.waitUntilReady()
  console.info('Affiliate product import worker is ready')

  let shuttingDown = false
  const shutdown = async (signal: string): Promise<void> => {
    if (shuttingDown) return
    shuttingDown = true

    console.info('Stopping affiliate product import worker', { signal })
    await worker.close()
    await db.close()
    process.exit(0)
  }

  process.once('SIGINT', () => void shutdown('SIGINT'))
  process.once('SIGTERM', () => void shutdown('SIGTERM'))
}

if (import.meta.main) {
  main().catch((error) => {
    console.error(error)
    process.exit(1)
  })
}
