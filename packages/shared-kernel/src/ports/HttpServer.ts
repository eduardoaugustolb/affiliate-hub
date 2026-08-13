export interface HttpRequest {
  params: Record<string, string>
  query: Record<string, string>
  cookies: Record<string, string>
  headers: Record<string, string>
  context: Record<string, unknown>
  body: unknown
}
export type JsonValue =
  | string
  | number
  | boolean
  | null
  | JsonValue[]
  | { [key: string]: JsonValue }

export type HttpResponseJsonBody = {
  message: string
  [key: string]: JsonValue
}

export type HttpNext = () => Promise<void>

export type Middleware = (
  request: HttpRequest,
  response: HttpResponse,
  next: HttpNext,
) => Promise<void> | Promise<unknown>

export interface CookieOptions {
  httpOnly?: boolean
  maxAge?: number
  path?: string
  sameSite?: 'lax' | 'strict' | 'none'
  secure?: boolean
}

export interface HttpResponse {
  status(code: HttpStatus): HttpResponse
  sendJson(body: HttpResponseJsonBody): void
  end(): void
  setCookie(name: string, value: string, options?: CookieOptions): void
  clearCookie(name: string, options?: CookieOptions): void
  redirect(url: string, statusCode?: HttpStatus): void
}

export type RouteHandler = (
  request: HttpRequest,
  response: HttpResponse,
) => Promise<void> | Promise<unknown>

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
  use(path: string, middleware: Middleware): void
  stop(): Promise<void>
}
