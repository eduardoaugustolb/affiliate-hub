import { authenticateUserBodySchema, sessionResponseSchema } from '@affiliate-hub/contracts'
import {
  type AuthenticateUser,
  type AuthenticateUserInput,
  type GetAuthenticatedUser,
  InvalidCredentialsError,
  type Logout,
} from '@affiliate-hub/identity-access'
import { type CookieOptions, type HttpServer, HttpStatus } from '@affiliate-hub/shared-kernel'
import { mapErrorToHttp } from '../ErrorMapper'
import { parse } from '../parse'

export interface SessionUseCases {
  authenticateUser: AuthenticateUser
  getAuthenticatedUser: GetAuthenticatedUser
  logout: Logout
}

const useSecureCookies = process.env.SESSION_COOKIE_SECURE !== 'false'
export const SESSION_COOKIE_NAME = useSecureCookies ? '__Host-session' : 'session'
export const SESSION_COOKIE_OPTIONS: CookieOptions = {
  httpOnly: true,
  secure: useSecureCookies,
  sameSite: 'lax',
  maxAge: 20 * 24 * 60 * 60,
  path: '/',
}

export function registerSessionRoutes(httpServer: HttpServer, useCases: SessionUseCases): void {
  httpServer.get('/session', async (req, res) => {
    try {
      const token = req.cookies[SESSION_COOKIE_NAME]
      if (!token) throw new InvalidCredentialsError('No token provided')
      const { user } = await useCases.getAuthenticatedUser.execute({ token })
      res.sendJson(
        parse(sessionResponseSchema, {
          message: 'Authenticated user retrieved successfully',
          user,
        }),
      )
    } catch (error) {
      mapErrorToHttp(error, res)
    }
  })

  httpServer.post('/session', async (req, res) => {
    try {
      const body = parse(authenticateUserBodySchema, req.body)
      const input: AuthenticateUserInput = body
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
      res.status(HttpStatus.NO_CONTENT).end()
    } catch (error) {
      mapErrorToHttp(error, res)
    }
  })
}
