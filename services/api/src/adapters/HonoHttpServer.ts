import {
  type HttpRequest,
  type HttpResponse,
  type HttpServer,
  HttpStatus,
  type RouteHandler,
} from '@affiliate-hub/shared-kernel'
import { type Context, Hono } from 'hono'

export class HonoHttpServer implements HttpServer {
  private readonly app = new Hono()

  get(path: string, handler: RouteHandler): void {
    this.app.get(path, (context) => this.execute(handler, context))
  }

  post(path: string, handler: RouteHandler): void {
    this.app.post(path, (context) => this.execute(handler, context))
  }

  async listen(port: number): Promise<void> {
    const server = Bun.serve({
      port,
      hostname: '0.0.0.0',
      fetch: this.app.fetch,
    })

    console.log(`Server is running on port ${server.port}`)
  }

  private async execute(handler: RouteHandler, context: Context): Promise<Response> {
    const httpRequest: HttpRequest = {
      params: context.req.param(),
      query: context.req.query(),
      body: await this.parseBody(context),
    }

    let statusCode: HttpStatus = HttpStatus.OK
    let responseBody: unknown
    let redirectTarget: { url: string; statusCode: HttpStatus } | undefined

    const httpResponse: HttpResponse = {
      status(code: HttpStatus) {
        statusCode = code
        return httpResponse
      },

      send(body: unknown) {
        responseBody = body
      },

      redirect(url: string, statusCode: HttpStatus = HttpStatus.FOUND) {
        redirectTarget = { url, statusCode }
      },
    }

    await handler(httpRequest, httpResponse)

    if (redirectTarget) {
      return Response.redirect(redirectTarget.url, redirectTarget.statusCode)
    }

    return this.createResponse(responseBody, statusCode)
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

  private createResponse(body: unknown, status: HttpStatus): Response {
    if (body === undefined || body === null) {
      return new Response(null, { status })
    }

    return Response.json(body, { status })
  }
}
