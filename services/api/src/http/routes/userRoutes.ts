import {
  updateUserBodySchema,
  userIdParamsSchema,
  userResponseSchema,
} from '@affiliate-hub/contracts'
import type { DeleteUser, UpdateUser } from '@affiliate-hub/identity-access'
import { type HttpServer, HttpStatus } from '@affiliate-hub/shared-kernel'
import { mapErrorToHttp } from '../ErrorMapper'
import { parse } from '../parse'

type AuthenticatedUser = { id: string; email: string; name: string }

export interface UserUseCases {
  deleteUser: DeleteUser
  updateUser: UpdateUser
}

function getAuthenticatedUser(context: Record<string, unknown>): AuthenticatedUser {
  const user = context.authenticatedUser
  if (!isAuthenticatedUser(user)) throw new Error('Authenticated user is required')
  return user
}

function isAuthenticatedUser(value: unknown): value is AuthenticatedUser {
  if (!value || typeof value !== 'object') return false
  const user = value as Record<string, unknown>
  return (
    typeof user.id === 'string' && typeof user.email === 'string' && typeof user.name === 'string'
  )
}

function presentUser(user: AuthenticatedUser) {
  return parse(userResponseSchema, { message: 'User retrieved successfully', user })
}

export function registerUserRoutes(httpServer: HttpServer, useCases: UserUseCases): void {
  httpServer.get('/users', async (request, response) => {
    try {
      response.sendJson(presentUser(getAuthenticatedUser(request.context)))
    } catch (error) {
      mapErrorToHttp(error, response)
    }
  })

  httpServer.get('/users/:id', async (request, response) => {
    try {
      const user = getAuthenticatedUser(request.context)
      const { id } = parse(userIdParamsSchema, request.params)
      if (id !== user.id) {
        response
          .status(HttpStatus.NOT_FOUND)
          .sendJson({ code: 'NOT_FOUND', message: 'User not found' })
        return
      }
      response.sendJson(presentUser(user))
    } catch (error) {
      mapErrorToHttp(error, response)
    }
  })

  httpServer.post('/users/me/update', async (request, response) => {
    try {
      const user = getAuthenticatedUser(request.context)
      const body = parse(updateUserBodySchema, request.body)
      await useCases.updateUser.execute({ userId: user.id, ...body })
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
