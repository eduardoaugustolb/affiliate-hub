import {
  type AuthenticateUser,
  type AuthenticateUserInput,
  type GetAuthenticatedUser,
  type GetAuthenticatedUserInput,
  InvalidCredentialsError,
  type Logout,
} from '@affiliate-hub/identity-access'
import {
  BadRequestError,
  type CookieOptions,
  type HttpServer,
  HttpStatus,
} from '@affiliate-hub/shared-kernel'
import { mapErrorToHttp } from '../ErrorMapper'

export interface SessionUseCases {
  authenticateUser: AuthenticateUser
  getAuthenticatedUser: GetAuthenticatedUser
  logout: Logout
}

export const SESSION_COOKIE_NAME = '__Host-session'
export const SESSION_COOKIE_OPTIONS: CookieOptions = {
  httpOnly: true,
  secure: true,
  sameSite: 'lax',
  maxAge: 20 * 24 * 60 * 60, // 20 days
  path: '/',
}

export function registerSessionRoutes(httpServer: HttpServer, useCases: SessionUseCases): void {
  httpServer.get('/session', async (req, res) => {
    try {
      const token = req.cookies[SESSION_COOKIE_NAME]
      if (!token) throw new InvalidCredentialsError('No token provided')
      const input: GetAuthenticatedUserInput = { token }
      const { user } = await useCases.getAuthenticatedUser.execute(input)

      res.sendJson({ message: 'Authenticated user retrieved successfully', user })
    } catch (error) {
      mapErrorToHttp(error, res)
    }
  })
  httpServer.post('/session', async (req, res) => {
    try {
      const { email, password } = req.body as Record<string, string | undefined>

      if (!email || !password) throw new BadRequestError('Email and password are required')

      const input: AuthenticateUserInput = {
        email,
        password,
      }
      const { token } = await useCases.authenticateUser.execute(input)
      res.setCookie(SESSION_COOKIE_NAME, token, SESSION_COOKIE_OPTIONS)
      res.status(HttpStatus.NO_CONTENT).end()
    } catch (error) {
      mapErrorToHttp(error, res)
    }
  })
  httpServer.post('/session/logout', async (req, res) => {
    try {
      const token = req.cookies[SESSION_COOKIE_NAME]

      if (!token) throw new InvalidCredentialsError('No token provided')

      await useCases.logout.execute({ token })
      res.clearCookie(SESSION_COOKIE_NAME, SESSION_COOKIE_OPTIONS)
      res.status(HttpStatus.NO_CONTENT)
      res.end()
    } catch (error) {
      mapErrorToHttp(error, res)
    }
  })
}
