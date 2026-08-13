import type { HttpServer } from '@affiliate-hub/shared-kernel'
import { BunNativeHttpServer } from '../src/adapters/http/BunNativeHttpServer'
import { BunRuntimeServer } from '../src/adapters/http/BunRuntimeServer'
import { HonoHttpServer } from '../src/adapters/http/HonoHttpServer'

export interface Contender {
  name: string
  port: number
  createServer: () => HttpServer
}

// Adicione um novo adapter aqui pra incluí-lo no benchmark — precisa só
// implementar HttpServer (packages/shared-kernel/src/ports/HttpServer.ts).
export const contenders: Contender[] = [
  {
    name: 'Hono (Bun.serve)',
    port: 4101,
    createServer: () => new HonoHttpServer(new BunRuntimeServer()),
  },
  {
    name: 'Bun.serve (raw)',
    port: 4105,
    createServer: () => new BunNativeHttpServer(),
  },
]
