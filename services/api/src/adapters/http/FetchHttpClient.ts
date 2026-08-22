import type {
  HttpClient,
  HttpClientResponse,
  HttpRequestOptions,
  HttpStatus,
} from '@affiliate-hub/shared-kernel'

export class FetchHttpClient implements HttpClient {
  async get<Body = unknown>(
    url: string,
    options?: HttpRequestOptions,
  ): Promise<HttpClientResponse<Body>> {
    return this.request<Body>('GET', url, options)
  }

  async post<Body = unknown>(
    url: string,
    options?: HttpRequestOptions,
  ): Promise<HttpClientResponse<Body>> {
    return this.request<Body>('POST', url, options)
  }

  private async request<Body>(
    method: 'GET' | 'POST',
    url: string,
    options?: HttpRequestOptions,
  ): Promise<HttpClientResponse<Body>> {
    const response = await fetch(url, {
      method,
      headers: options?.headers,
      body: options?.body === undefined ? undefined : String(options.body),
    })

    return {
      status: response.status as HttpStatus,
      body: (await response.json()) as Body,
    }
  }
}
