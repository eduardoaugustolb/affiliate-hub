import { ShopeeAffiliateProvider } from '@affiliate-hub/affiliate-sync/infrastructure'
import {
  type AffiliateLinkGenerator,
  ApproveProductMedia,
  DeactivateProduct,
  ListProductsForCuration,
  RegisterManualProduct,
  RegisterProduct,
} from '@affiliate-hub/catalog'
import { CatalogUnitOfWorkSql, ProductRepositorySql } from '@affiliate-hub/catalog/adapters'
import {
  AuthenticateUser,
  DeleteUser,
  GetAuthenticatedUser,
  Logout,
  SetupInitialUser,
  UpdateUser,
} from '@affiliate-hub/identity-access'
import {
  CryptoTokenGenerator,
  IdentityAccessUnitOfWorkSql,
  SessionRepositorySql,
  UserRepositorySql,
} from '@affiliate-hub/identity-access/adapters'
import { ClickLogSql, RedirectToAffiliateLink } from '@affiliate-hub/link-redirect'
import type { HttpServer } from '@affiliate-hub/shared-kernel'
import { CatalogPublishedProductReader } from './adapters/catalog/CatalogPublishedProductReader'
import { Argon2Hasher } from './adapters/crypto/Argon2Hasher'
import { CipherAdapter } from './adapters/crypto/CipherAdapter'
import { HmacKeyedHasher } from './adapters/crypto/HmacKeyedHasher'
import { IdGeneratorBun } from './adapters/crypto/IdGeneratorBun'
import { PgAdapter } from './adapters/database/PgAdapter'
import { BunRuntimeServer } from './adapters/http/BunRuntimeServer'
import { FetchHttpClient } from './adapters/http/FetchHttpClient'
import { HonoHttpServer } from './adapters/http/HonoHttpServer'
import { env } from './env'
import { requireAuthentication } from './http/middlewares/RequireAuthentication'
import { requireCsrf } from './http/middlewares/RequireCsrf'
import { type AdminUseCases, registerAdminRoutes } from './http/routes/adminRoutes'
import { type CatalogUseCases, registerCatalogRoutes } from './http/routes/catalogRoutes'
import {
  type LinkRedirectUseCases,
  registerLinkRedirectRoutes,
} from './http/routes/linkRedirectRoutes'
import { registerSessionRoutes, type SessionUseCases } from './http/routes/sessionRoutes'
import { registerUserRoutes, type UserUseCases } from './http/routes/userRoutes'

export interface ServerDependencies {
  affiliateLinkGenerator?: AffiliateLinkGenerator
}

export function createServer(dependencies: ServerDependencies = {}): HttpServer {
  const runtime = new BunRuntimeServer()

  const databaseUrl = env.DATABASE_URL
  if (!databaseUrl) {
    throw new Error('DATABASE_URL is not set')
  }

  const db = new PgAdapter(databaseUrl)
  const productRepository = new ProductRepositorySql(db)
  const catalogUnitOfWork = new CatalogUnitOfWorkSql(db)
  const clickLog = new ClickLogSql(db)
  const idGenerator = new IdGeneratorBun()
  const affiliateLinkGenerator =
    dependencies.affiliateLinkGenerator ?? createShopeeAffiliateLinkGenerator()

  const sessionRepository = new SessionRepositorySql(db)
  const cipher = new CipherAdapter(Buffer.from(env.PII_ENCRYPTION_KEY, 'base64url'))
  const emailLookupHasher = new HmacKeyedHasher(env.EMAIL_LOOKUP_HMAC_KEY)
  const sessionTokenHasher = new HmacKeyedHasher(env.SESSION_TOKEN_HMAC_KEY)
  const argon2Hasher = new Argon2Hasher()
  const tokenGenerator = new CryptoTokenGenerator()
  const userRepository = new UserRepositorySql(db, cipher, emailLookupHasher)

  const catalogUseCases: CatalogUseCases = {
    registerProduct: new RegisterProduct(productRepository, idGenerator),
    registerManualProduct: new RegisterManualProduct(
      productRepository,
      idGenerator,
      affiliateLinkGenerator,
    ),
    approveProductMedia: new ApproveProductMedia(catalogUnitOfWork),
    deactivateProduct: new DeactivateProduct(catalogUnitOfWork),
    listProductsForCuration: new ListProductsForCuration(productRepository),
  }

  const linkRedirectUseCases: LinkRedirectUseCases = {
    redirectToAffiliateLink: new RedirectToAffiliateLink(
      new CatalogPublishedProductReader(productRepository),
      clickLog,
    ),
  }

  const sessionUseCases: SessionUseCases = {
    logout: new Logout(sessionRepository, sessionTokenHasher),
    authenticateUser: new AuthenticateUser(
      userRepository,
      sessionRepository,
      argon2Hasher,
      tokenGenerator,
      sessionTokenHasher,
      idGenerator,
    ),
    getAuthenticatedUser: new GetAuthenticatedUser(
      userRepository,
      sessionRepository,
      sessionTokenHasher,
    ),
  }

  const userUseCases: UserUseCases = {
    updateUser: new UpdateUser(userRepository),
    deleteUser: new DeleteUser(userRepository),
  }

  const adminUseCases: AdminUseCases = {
    setupInitialUser: new SetupInitialUser(
      new IdentityAccessUnitOfWorkSql(db, cipher, emailLookupHasher),
      idGenerator,
      argon2Hasher,
      tokenGenerator,
      sessionTokenHasher,
    ),
  }

  const allowedOrigins = new Set(
    env.API_ALLOWED_ORIGINS.split(',')
      .map((origin) => origin.trim())
      .filter(Boolean),
  )
  if (env.NODE_ENV === 'production' && allowedOrigins.size === 0) {
    throw new Error('API_ALLOWED_ORIGINS must contain at least one origin in production')
  }

  const httpServer = new HonoHttpServer(runtime, { allowedOrigins: [...allowedOrigins] })
  const authentication = requireAuthentication(sessionUseCases.getAuthenticatedUser)
  const csrf = requireCsrf(allowedOrigins)
  httpServer.use('/products', authentication)
  httpServer.use('/products/*', authentication)
  httpServer.use('/users', authentication)
  httpServer.use('/users/*', authentication)
  httpServer.use('/products', csrf)
  httpServer.use('/products/*', csrf)
  httpServer.use('/users', csrf)
  httpServer.use('/users/*', csrf)
  httpServer.use('/session/logout', csrf)
  registerCatalogRoutes(httpServer, catalogUseCases)
  registerLinkRedirectRoutes(httpServer, linkRedirectUseCases)
  registerSessionRoutes(httpServer, sessionUseCases)
  registerUserRoutes(httpServer, userUseCases)
  registerAdminRoutes(httpServer, adminUseCases)
  return httpServer
}

function createShopeeAffiliateLinkGenerator(): AffiliateLinkGenerator {
  if (!env.SHOPEE_APP_ID || !env.SHOPEE_PASSWORD) {
    return {
      async generateAffiliateLink(): Promise<string> {
        throw new Error('Shopee Affiliate API is not configured')
      },
    }
  }

  const provider = new ShopeeAffiliateProvider(new FetchHttpClient(), {
    appId: env.SHOPEE_APP_ID,
    secret: env.SHOPEE_PASSWORD,
  })

  return {
    async generateAffiliateLink(productUrl: string): Promise<string> {
      return (await provider.generateShortLink(productUrl)).toString()
    },
  }
}

async function main(): Promise<void> {
  const httpServer = createServer()
  const port = env.PORT
  await httpServer.listen(port)
}

if (import.meta.main) {
  main().catch((error) => {
    console.error(error)
    process.exit(1)
  })
}
