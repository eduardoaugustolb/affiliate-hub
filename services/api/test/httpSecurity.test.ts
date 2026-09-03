import { afterAll, beforeAll, describe, expect, it } from 'bun:test'
import { type HttpRequest, type HttpResponse, HttpStatus } from '@affiliate-hub/shared-kernel'
import { BunRuntimeServer } from '../src/adapters/http/BunRuntimeServer'
import { HonoHttpServer } from '../src/adapters/http/HonoHttpServer'
import { requireCsrf } from '../src/http/middlewares/RequireCsrf'

function request(overrides: Partial<HttpRequest> = {}): HttpRequest {
  return {
    method: 'POST',
    params: {},
    query: {},
    cookies: {},
    context: {},
    body: undefined,
    headers: { cookie: '__Host-session=token', origin: 'https://admin.example.com' },
    ...overrides,
  }
}

function response() {
  let status = HttpStatus.OK
  let body: unknown
  const value: HttpResponse = {
    status(code) {
      status = code
      return value
    },
    sendJson(payload) {
      body = payload
    },
    end() {},
    setCookie() {},
    clearCookie() {},
    redirect() {},
  }
  return {
    value,
    get status() {
      return status
    },
    get body() {
      return body
    },
  }
}

describe('CSRF middleware', () => {
  it('allows a cookie mutation from an explicitly allowed origin', async () => {
    const res = response()
    let called = false
    await requireCsrf(new Set(['https://admin.example.com']))(request(), res.value, async () => {
      called = true
    })
    expect(called).toBe(true)
  })

  it('rejects a cookie mutation with a foreign origin', async () => {
    const res = response()
    await requireCsrf(new Set(['https://admin.example.com']))(
      request({ headers: { cookie: '__Host-session=token', origin: 'https://evil.example.com' } }),
      res.value,
      async () => {},
    )
    expect(res.status).toBe(HttpStatus.FORBIDDEN)
    expect(res.body).toEqual({ code: 'CSRF_FORBIDDEN', message: 'CSRF validation failed' })
  })
})

describe('CORS preflight', () => {
  const port = 3058
  let server: HonoHttpServer

  beforeAll(async () => {
    server = new HonoHttpServer(new BunRuntimeServer(), {
      allowedOrigins: ['https://admin.example.com'],
    })
    server.post('/protected', async (_request, response) => {
      response.status(HttpStatus.NO_CONTENT).end()
    })
    await server.listen(port)
  })

  afterAll(async () => {
    await server.stop()
  })

  it('returns credentialed CORS headers for an allowed preflight origin', async () => {
    const preflight = await fetch(`http://localhost:${port}/protected`, {
      method: 'OPTIONS',
      headers: {
        Origin: 'https://admin.example.com',
        'Access-Control-Request-Method': 'POST',
        'Access-Control-Request-Headers': 'content-type',
      },
    })

    expect(preflight.status).toBe(204)
    expect(preflight.headers.get('access-control-allow-origin')).toBe('https://admin.example.com')
    expect(preflight.headers.get('access-control-allow-credentials')).toBe('true')
    expect(preflight.headers.get('access-control-allow-methods')).toContain('POST')
    expect(preflight.headers.get('access-control-allow-headers')?.toLowerCase()).toContain(
      'content-type',
    )
  })
})
