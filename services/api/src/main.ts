import {
  ApproveProductMedia,
  DeactivateProduct,
  ListProductsForCuration,
  OutboxPublisherDatabase,
  ProductRepositoryDatabase,
  RegisterProduct,
} from '@affiliate-hub/catalog'
import { ClickLogDatabase, RedirectToAffiliateLink } from '@affiliate-hub/link-redirect'
import type { HttpServer } from '@affiliate-hub/shared-kernel'
import { HonoHttpServer } from './adapters/HonoHttpServer'
import { IdGeneratorBun } from './adapters/IdGeneratorBun'
import { PgAdapter } from './adapters/PgAdapter'
import { registerCatalogRoutes } from './http/catalogRoutes'
import { registerLinkRedirectRoutes } from './http/linkRedirectRoutes'

export function createServer(): HttpServer {
  const databaseUrl = process.env.DATABASE_URL
  if (!databaseUrl) {
    throw new Error('DATABASE_URL is not set')
  }

  const db = new PgAdapter(databaseUrl)
  const productRepository = new ProductRepositoryDatabase(db)
  const eventPublisher = new OutboxPublisherDatabase(db)
  const clickLog = new ClickLogDatabase(db)
  const idGenerator = new IdGeneratorBun()

  const catalogUseCases = {
    registerProduct: new RegisterProduct(productRepository, idGenerator),
    approveProductMedia: new ApproveProductMedia(productRepository, eventPublisher),
    deactivateProduct: new DeactivateProduct(productRepository, eventPublisher),
    listProductsForCuration: new ListProductsForCuration(productRepository),
  }

  const linkRedirectUseCases = {
    redirectToAffiliateLink: new RedirectToAffiliateLink(productRepository, clickLog),
  }

  const httpServer = new HonoHttpServer()
  registerCatalogRoutes(httpServer, catalogUseCases)
  registerLinkRedirectRoutes(httpServer, linkRedirectUseCases)
  return httpServer
}

async function main(): Promise<void> {
  const httpServer = createServer()
  const port = Number(process.env.PORT ?? 3000)
  await httpServer.listen(port)
}

if (import.meta.main) {
  main().catch((error) => {
    console.error(error)
    process.exit(1)
  })
}
