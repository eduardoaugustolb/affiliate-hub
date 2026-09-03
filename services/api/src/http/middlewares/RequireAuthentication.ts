import { type GetAuthenticatedUser, InvalidCredentialsError } from '@affiliate-hub/identity-access'
import { HttpStatus, type Middleware } from '@affiliate-hub/shared-kernel'
import { SESSION_COOKIE_NAME } from '../routes/sessionRoutes'

export function requireAuthentication(getAuthenticatedUser: GetAuthenticatedUser): Middleware {
  return async (request, response, next) => {
    try {
      const token = request.cookies[SESSION_COOKIE_NAME]
      if (!token) throw new InvalidCredentialsError('Missing session token')

      const { user } = await getAuthenticatedUser.execute({ token })
      request.context.authenticatedUser = user
      await next()
    } catch {
      response
        .status(HttpStatus.UNAUTHORIZED)
        .sendJson({ code: 'UNAUTHORIZED', message: 'Unauthorized' })
    }
  }
}
