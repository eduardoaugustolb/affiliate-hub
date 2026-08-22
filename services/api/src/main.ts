import {
  ApproveProductMedia,
  DeactivateProduct,
  ListProductsForCuration,
  OutboxPublisherSql,
  ProductRepositorySql,
  RegisterManualProduct,
} from '@affiliate-hub/catalog'
import {
  AuthenticateUser,
  CryptoTokenGenerator,
  DeleteUser,
  GetAuthenticatedUser,
  IdentityAccessUnitOfWorkSql,
  Logout,
  SessionRepositorySql,
  SetupInitialUser,
  UpdateUser,
  UserRepositorySql,
} from '@affiliate-hub/identity-access'
import { ClickLogSql, RedirectToAffiliateLink } from '@affiliate-hub/link-redirect'
import type { HttpServer } from '@affiliate-hub/shared-kernel'
import { Argon2Hasher } from './adapters/crypto/Argon2Hasher'
import { CipherAdapter } from './adapters/crypto/CipherAdapter'
import { HmacKeyedHasher } from './adapters/crypto/HmacKeyedHasher'
import { IdGeneratorBun } from './adapters/crypto/IdGeneratorBun'
import { PgAdapter } from './adapters/database/PgAdapter'
import { BunRuntimeServer } from './adapters/http/BunRuntimeServer'
import { HonoHttpServer } from './adapters/http/HonoHttpServer'
import { env } from './env'
import { requireAuthentication } from './http/middlewares/RequireAuthentication'
import { type AdminUseCases, registerAdminRoutes } from './http/routes/adminRoutes'
import { type CatalogUseCases, registerCatalogRoutes } from './http/routes/catalogRoutes'
import {
  type LinkRedirectUseCases,
  registerLinkRedirectRoutes,
} from './http/routes/linkRedirectRoutes'
import { registerSessionRoutes, type SessionUseCases } from './http/routes/sessionRoutes'
import { registerUserRoutes, type UserUseCases } from './http/routes/userRoutes'

export function createServer(): HttpServer {
  const runtime = new BunRuntimeServer()

  const databaseUrl = env.DATABASE_URL
  if (!databaseUrl) {
    throw new Error('DATABASE_URL is not set')
  }

  const db = new PgAdapter(databaseUrl)

  const productRepository = new ProductRepositorySql(db)
  const eventPublisher = new OutboxPublisherSql(db)
  const clickLog = new ClickLogSql(db)
  const idGenerator = new IdGeneratorBun()

  const sessionRepository = new SessionRepositorySql(db)
  const cipher = new CipherAdapter(Buffer.from(env.PII_ENCRYPTION_KEY, 'base64url'))
  const emailLookupHasher = new HmacKeyedHasher(env.EMAIL_LOOKUP_HMAC_KEY)
  const sessionTokenHasher = new HmacKeyedHasher(env.SESSION_TOKEN_HMAC_KEY)
  const argon2Hasher = new Argon2Hasher()
  const tokenGenerator = new CryptoTokenGenerator()
  const userRepository = new UserRepositorySql(db, cipher, emailLookupHasher)

  const catalogUseCases: CatalogUseCases = {
    registerManualProduct: new RegisterManualProduct(productRepository, idGenerator),
    approveProductMedia: new ApproveProductMedia(productRepository, eventPublisher),
    deactivateProduct: new DeactivateProduct(productRepository, eventPublisher),
    listProductsForCuration: new ListProductsForCuration(productRepository),
  }

  const linkRedirectUseCases: LinkRedirectUseCases = {
    redirectToAffiliateLink: new RedirectToAffiliateLink(productRepository, clickLog),
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
      new IdentityAccessUnitOfWorkSql(db, cipher, new HmacKeyedHasher(env.EMAIL_LOOKUP_HMAC_KEY)),
      idGenerator,
      argon2Hasher,
      tokenGenerator,
      new HmacKeyedHasher(env.SESSION_TOKEN_HMAC_KEY),
    ),
  }

  const httpServer = new HonoHttpServer(runtime)
  httpServer.use('/products', requireAuthentication(sessionUseCases.getAuthenticatedUser))
  httpServer.use('/products/*', requireAuthentication(sessionUseCases.getAuthenticatedUser))
  httpServer.use('/users/*', requireAuthentication(sessionUseCases.getAuthenticatedUser))
  registerCatalogRoutes(httpServer, catalogUseCases)
  registerLinkRedirectRoutes(httpServer, linkRedirectUseCases)
  registerSessionRoutes(httpServer, sessionUseCases)
  registerUserRoutes(httpServer, userUseCases)
  registerAdminRoutes(httpServer, adminUseCases)
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
