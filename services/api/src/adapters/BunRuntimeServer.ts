import type { FetchHandler, HttpRuntimeAdapter, RunningServer } from '@affiliate-hub/shared-kernel'

export class BunRuntimeServer implements HttpRuntimeAdapter {
  async serve(
    handler: FetchHandler,
    options: { port: number; hostname?: string },
  ): Promise<RunningServer> {
    const server = Bun.serve({
      fetch: handler,
      port: options.port,
      hostname: options.hostname || 'localhost',
    })

    if (!server.port) throw new Error('Bun.serve did not return the door')

    return {
      port: server.port,
      stop() {
        server.stop()
        return Promise.resolve()
      },
    }
  }
}
