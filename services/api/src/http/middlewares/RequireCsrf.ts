import { HttpStatus, type Middleware } from '@affiliate-hub/shared-kernel'

const SAFE_METHODS = new Set(['GET', 'HEAD', 'OPTIONS'])

export function requireCsrf(allowedOrigins: ReadonlySet<string>): Middleware {
  return async (request, response, next) => {
    if (SAFE_METHODS.has(request.method)) {
      await next()
      return
    }

    // Cookie-authenticated mutations must prove they originated from an allowed site.
    const cookieHeader = request.headers.cookie
    if (!cookieHeader) {
      await next()
      return
    }

    const origin = request.headers.origin ?? request.headers.referer
    if (!origin || !isAllowedOrigin(origin, allowedOrigins)) {
      response.status(HttpStatus.FORBIDDEN).sendJson({
        code: 'CSRF_FORBIDDEN',
        message: 'CSRF validation failed',
      })
      return
    }
    await next()
  }
}

function isAllowedOrigin(value: string, allowedOrigins: ReadonlySet<string>): boolean {
  try {
    return allowedOrigins.has(new URL(value).origin)
  } catch {
    return false
  }
}
