export interface HttpRequest {
  params: Record<string, string>
  query: Record<string, string>
  body: unknown
}

export interface HttpResponse {
  status(code: HttpStatus): HttpResponse
  send(body: unknown): void
  redirect(url: string, statusCode?: HttpStatus): void
}

export type RouteHandler = (request: HttpRequest, response: HttpResponse) => Promise<void>

export const HttpStatus = {
  OK: 200,
  CREATED: 201,
  FOUND: 302,
  NO_CONTENT: 204,
  BAD_REQUEST: 400,
  UNAUTHORIZED: 401,
  FORBIDDEN: 403,
  NOT_FOUND: 404,
  INTERNAL_SERVER_ERROR: 500,
} as const

export type HttpStatus = (typeof HttpStatus)[keyof typeof HttpStatus]

export interface HttpServer {
  get(path: string, handler: RouteHandler): void
  post(path: string, handler: RouteHandler): void
  listen(port: number): Promise<void>
}
