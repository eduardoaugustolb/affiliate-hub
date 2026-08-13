import type { DeleteUser, UpdateUser } from '@affiliate-hub/identity-access'
import { BadRequestError, HttpStatus, type HttpServer } from '@affiliate-hub/shared-kernel'
import { mapErrorToHttp } from '../ErrorMapper'

interface AuthenticatedUser {
  id: string
  email: string
  name: string
}

export interface UserUseCases {
  deleteUser: DeleteUser
  updateUser: UpdateUser
}

function getAuthenticatedUser(context: Record<string, unknown>): AuthenticatedUser {
  const user = context.authenticatedUser as AuthenticatedUser | undefined
  if (!user) throw new Error('Authenticated user is required')
  return user
}

export function registerUserRoutes(httpServer: HttpServer, useCases: UserUseCases): void {
  httpServer.post('/users/me/update', async (request, response) => {
    try {
      const user = getAuthenticatedUser(request.context)
      const { email, name } = request.body as Record<string, string | undefined>
      if (!email && !name) throw new BadRequestError('Name or email is required')

      await useCases.updateUser.execute({ userId: user.id, email, name })
      response.status(HttpStatus.NO_CONTENT).end()
    } catch (error) {
      mapErrorToHttp(error, response)
    }
  })

  httpServer.post('/users/me/delete', async (request, response) => {
    try {
      const user = getAuthenticatedUser(request.context)
      await useCases.deleteUser.execute({ userId: user.id })
      response.status(HttpStatus.NO_CONTENT).end()
    } catch (error) {
      mapErrorToHttp(error, response)
    }
  })
}
