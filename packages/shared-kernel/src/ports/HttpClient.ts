import type { HttpStatus } from "./HttpServer"

export interface HttpRequestOptions {
  headers?: Record<string, string>
  body?: unknown
}

export interface HttpClientResponse<Body = unknown> {
  status: HttpStatus
  body: Body
}

export interface HttpClient {
  get<Body = unknown>(url: string, options?: HttpRequestOptions): Promise<HttpClientResponse<Body>>
  post<Body = unknown>(url: string, options?: HttpRequestOptions): Promise<HttpClientResponse<Body>>
}
