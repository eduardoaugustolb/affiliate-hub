import {
  InitialSetupAlreadyCompletedError,
  InvalidCredentialsError,
} from '@affiliate-hub/identity-access'
import {
  ApplicationError,
  BadRequestError,
  ConflictError,
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
  if (error instanceof ConflictError || error instanceof InitialSetupAlreadyCompletedError) {
    response.status(HttpStatus.CONFLICT).sendJson({
      code: 'CONFLICT',
      message: error.message,
    })
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

  console.error('[HTTP] Unhandled error', {
    name: error instanceof Error ? error.name : typeof error,
    message: error instanceof Error ? error.message : String(error),
    stack: error instanceof Error ? error.stack : undefined,
  })
  response.status(HttpStatus.INTERNAL_SERVER_ERROR).sendJson({
    code: 'INTERNAL_ERROR',
    message: 'Unexpected internal error',
  })
}
