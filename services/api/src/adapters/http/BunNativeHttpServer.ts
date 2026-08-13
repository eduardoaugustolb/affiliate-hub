import {
  type CookieOptions,
  type HttpRequest,
  type HttpResponse,
  type HttpResponseJsonBody,
  type HttpServer,
  HttpStatus,
  type Middleware,
  type RouteHandler,
} from '@affiliate-hub/shared-kernel'

// Adapter só pra baseline de benchmark: nenhum framework, roteamento manual
// por "MÉTODO path" exato. Não suporta params dinâmicos (:id) — não precisa
// pro que o bench usa (/ping, /echo), mas não é um HttpServer de propósito
// geral como os outros adapters.
export class BunNativeHttpServer implements HttpServer {
  private readonly routes = new Map<string, RouteHandler>()
  private readonly middlewares: Array<{ path: string; middleware: Middleware }> = []
  private server: ReturnType<typeof Bun.serve> | undefined

  get(path: string, handler: RouteHandler): void {
    this.routes.set(`GET ${path}`, handler)
  }

  post(path: string, handler: RouteHandler): void {
    this.routes.set(`POST ${path}`, handler)
  }

  use(path: string, middleware: Middleware): void {
    this.middlewares.push({ path, middleware })
  }

  async listen(port: number): Promise<void> {
    this.server = Bun.serve({
      port,
      hostname: '0.0.0.0',
      fetch: (request) => this.dispatch(request),
    })

    console.log(`Bun.serve puro rodando na porta ${this.server.port}`)
  }

  async stop(): Promise<void> {
    this.server?.stop()
    console.log('Bun.serve puro parado')
  }

  private async dispatch(request: Request): Promise<Response> {
    const url = new URL(request.url)
    const handler = this.routes.get(`${request.method} ${url.pathname}`)

    if (!handler) {
      return new Response(null, { status: HttpStatus.NOT_FOUND })
    }

    const httpRequest: HttpRequest = {
      context: {},
      params: {},
      query: Object.fromEntries(url.searchParams),
      cookies: this.parseCookies(request.headers.get('cookie')),
      headers: Object.fromEntries(request.headers),
      body: await this.parseBody(request),
    }

    let statusCode: HttpStatus = HttpStatus.OK
    let responseBody: HttpResponseJsonBody | undefined
    let ended = false
    let redirectTarget: { url: string; statusCode: HttpStatus } | undefined
    const headers = new Headers()
    const serializeCookie = this.serializeCookie

    const httpResponse: HttpResponse = {
      status(code: HttpStatus) {
        statusCode = code
        return httpResponse
      },
      sendJson(body: HttpResponseJsonBody) {
        responseBody = body
      },
      end() {
        ended = true
      },
      setCookie(name: string, value: string, options = {}) {
        headers.append('set-cookie', serializeCookie(name, value, options))
      },
      clearCookie(name: string, options = {}) {
        headers.append('set-cookie', serializeCookie(name, '', { ...options, maxAge: 0 }))
      },
      redirect(url: string, code: HttpStatus = HttpStatus.FOUND) {
        redirectTarget = { url, statusCode: code }
      },
    }

    const middlewares = this.middlewares.filter(
      ({ path }) => path === '*' || url.pathname.startsWith(path),
    )
    let index = -1
    const next = async (): Promise<void> => {
      index += 1
      const current = middlewares[index]
      if (current) {
        await current.middleware(httpRequest, httpResponse, next)
        return
      }
      await handler(httpRequest, httpResponse)
    }
    await next()

    if (redirectTarget) {
      return Response.redirect(redirectTarget.url, redirectTarget.statusCode)
    }

    if (ended) {
      return new Response(null, { status: statusCode, headers })
    }

    return Response.json(responseBody, { status: statusCode, headers })
  }

  private async parseBody(request: Request): Promise<unknown> {
    if (request.method === 'GET' || request.method === 'HEAD') {
      return undefined
    }

    const contentLength = request.headers.get('content-length')
    if (!contentLength || contentLength === '0') {
      return undefined
    }

    return request.json()
  }

  private parseCookies(header: string | null): Record<string, string> {
    if (!header) return {}
    return Object.fromEntries(
      header.split(';').map((item) => {
        const [name, ...value] = item.trim().split('=')
        return [name ?? '', decodeURIComponent(value.join('='))]
      }),
    )
  }

  private readonly serializeCookie = (
    name: string,
    value: string,
    options: CookieOptions,
  ): string => {
    const attributes = [`${name}=${encodeURIComponent(value)}`]
    if (options.httpOnly) attributes.push('HttpOnly')
    if (typeof options.maxAge === 'number') attributes.push(`Max-Age=${options.maxAge}`)
    if (typeof options.path === 'string') attributes.push(`Path=${options.path}`)
    if (typeof options.sameSite === 'string') attributes.push(`SameSite=${options.sameSite}`)
    if (options.secure) attributes.push('Secure')
    return attributes.join('; ')
  }
}
