import { InvalidCredentialsError } from '@affiliate-hub/identity-access'
import {
  ApplicationError,
  BadRequestError,
  DomainError,
  type HttpResponse,
  HttpStatus,
  NotFoundError,
} from '@affiliate-hub/shared-kernel'
import { ZodError } from 'zod'

export function mapErrorToHttp(error: unknown, response: HttpResponse): void {
  if (error instanceof ZodError) {
    response.status(HttpStatus.BAD_REQUEST).sendJson({
      code: 'VALIDATION_ERROR',
      message: 'Request payload is invalid',
    })
    return
  }
  if (error instanceof NotFoundError) {
    response.status(HttpStatus.NOT_FOUND).sendJson({ code: 'NOT_FOUND', message: error.message })
    return
  }
  if (error instanceof BadRequestError) {
    response
      .status(HttpStatus.BAD_REQUEST)
      .sendJson({ code: 'BAD_REQUEST', message: error.message })
    return
  }
  if (error instanceof InvalidCredentialsError) {
    response
      .status(HttpStatus.UNAUTHORIZED)
      .sendJson({ code: 'UNAUTHORIZED', message: 'Unauthorized' })
    return
  }
  if (error instanceof DomainError || error instanceof ApplicationError) {
    response
      .status(HttpStatus.BAD_REQUEST)
      .sendJson({ code: 'DOMAIN_ERROR', message: error.message })
    return
  }
  response.status(HttpStatus.INTERNAL_SERVER_ERROR).sendJson({
    code: 'INTERNAL_ERROR',
    message: 'Unexpected internal error',
  })
}
