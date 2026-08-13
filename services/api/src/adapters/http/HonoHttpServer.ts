import {
  type CookieOptions,
  type HttpRequest,
  type HttpResponse,
  type HttpResponseJsonBody,
  type HttpRuntimeAdapter,
  type HttpServer,
  HttpStatus,
  type Middleware,
  type RouteHandler,
  type RunningServer,
} from '@affiliate-hub/shared-kernel'
import { type Context, Hono } from 'hono'
import { deleteCookie, getCookie, setCookie } from 'hono/cookie'

const REQUEST_CONTEXT_KEY = 'httpRequest'

interface ResponseState {
  body: HttpResponseJsonBody | undefined
  ended: boolean
  redirect: { url: string; statusCode: HttpStatus } | undefined
  status: HttpStatus
}

export class HonoHttpServer implements HttpServer {
  private runningServer: RunningServer | undefined
  private readonly app = new Hono()
  constructor(private readonly runtime: HttpRuntimeAdapter) {}
  get(path: string, handler: RouteHandler): void {
    this.app.get(path, (context) => this.execute(handler, context))
  }

  post(path: string, handler: RouteHandler): void {
    this.app.post(path, (context) => this.execute(handler, context))
  }

  async listen(port: number): Promise<void> {
    this.runningServer = await this.runtime.serve(this.app.fetch, {
      port,
      hostname: '0.0.0.0',
    })

    console.log(`Server is running on port ${this.runningServer?.port} with Hono`)
  }

  async stop(): Promise<void> {
    await this.runningServer?.stop()
    console.log('Hono server stopped')
  }

  use(path: string, middleware: Middleware): void {
    this.app.use(path, async (context, next) => {
      const request = await this.getRequest(context)
      const { response, state } = this.createResponseAdapter(context)
      let calledNext = false

      await middleware(request, response, async () => {
        calledNext = true
        await next()
      })

      if (calledNext) return context.res
      return this.toResponse(state, context)
    })
  }

  private async execute(handler: RouteHandler, context: Context): Promise<Response> {
    const request = await this.getRequest(context)
    request.params = context.req.param()
    request.query = context.req.query()
    const { response, state } = this.createResponseAdapter(context)
    await handler(request, response)
    return this.toResponse(state, context)
  }

  private createResponseAdapter(context: Context): {
    response: HttpResponse
    state: ResponseState
  } {
    const state: ResponseState = {
      body: undefined,
      ended: false,
      redirect: undefined,
      status: HttpStatus.OK,
    }
    const response: HttpResponse = {
      status(code: HttpStatus) {
        state.status = code
        return response
      },

      sendJson(body: HttpResponseJsonBody) {
        state.body = body
      },

      end() {
        state.ended = true
      },

      clearCookie(name: string, options?: CookieOptions) {
        deleteCookie(context, name, options)
      },

      setCookie(name: string, value: string, options?: CookieOptions) {
        setCookie(context, name, value, options)
      },

      redirect(url: string, statusCode: HttpStatus = HttpStatus.FOUND) {
        state.redirect = { url, statusCode }
      },
    }
    return { response, state }
  }

  private toResponse(state: ResponseState, context: Context): Response {
    const redirectTarget = state.redirect
    if (redirectTarget) {
      const headers = new Headers(context.res.headers)
      headers.set('location', redirectTarget.url)
      return new Response(null, { status: redirectTarget.statusCode, headers })
    }

    return this.createResponse(
      state.ended ? undefined : state.body,
      state.status,
      context.res.headers,
    )
  }

  private async getRequest(context: Context): Promise<HttpRequest> {
    const existing = context.get(REQUEST_CONTEXT_KEY) as HttpRequest | undefined
    if (existing) return existing

    const request: HttpRequest = {
      context: {},
      params: context.req.param(),
      query: context.req.query(),
      body: await this.parseBody(context),
      cookies: getCookie(context),
      headers: context.req.header(),
    }
    context.set(REQUEST_CONTEXT_KEY, request)
    return request
  }

  private async parseBody(context: Context): Promise<unknown> {
    if (context.req.method === 'GET' || context.req.method === 'HEAD') {
      return undefined
    }

    const contentLength = context.req.header('content-length')
    if (!contentLength || contentLength === '0') {
      return undefined
    }

    return context.req.json()
  }

  private createResponse(
    body: HttpResponseJsonBody | undefined,
    status: HttpStatus,
    headers: Headers,
  ): Response {
    if (body === undefined || body === null) {
      return new Response(null, { status, headers })
    }

    return Response.json(body, { status, headers })
  }
}
