import type { SetupInitialUser } from '@affiliate-hub/identity-access'
import { BadRequestError, type HttpServer } from '@affiliate-hub/shared-kernel'
import { mapErrorToHttp } from '../ErrorMapper'
import { SESSION_COOKIE_NAME, SESSION_COOKIE_OPTIONS } from './sessionRoutes'
export interface AdminUseCases {
  setupInitialUser: SetupInitialUser
}

export function registerAdminRoutes(httpServer: HttpServer, useCases: AdminUseCases): void {
  httpServer.post('/admin/setup', async (req, res) => {
    try {
      const { email, name, password } = req.body as Record<string, string>

      if (!email || !name || !password) {
        throw new BadRequestError('Missing required fields')
      }

      const { token } = await useCases.setupInitialUser.execute({
        email,
        name,
        password,
      })
      res.setCookie(SESSION_COOKIE_NAME, token, SESSION_COOKIE_OPTIONS)

      res.status(201).sendJson({ message: 'User registered successfully' })
    } catch (error) {
      mapErrorToHttp(error, res)
    }
  })
}
