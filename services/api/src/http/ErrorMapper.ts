import {
  InitialSetupAlreadyCompletedError,
  InvalidCredentialsError,
} from '@affiliate-hub/identity-access'
import {
  ApplicationError,
  BadRequestError,
  ConflictError,
  DomainError,
  ExternalServiceError,
  type HttpResponse,
  HttpStatus,
  NotFoundError,
  UnauthorizedError,
} from '@affiliate-hub/shared-kernel'

export function mapErrorToHttp(error: unknown, response: HttpResponse): void {
  if (isErrorOfType(error, NotFoundError, 'NotFoundError')) {
    response.status(HttpStatus.NOT_FOUND).sendJson({ message: errorMessage(error) })
    return
  }

  if (isErrorOfType(error, BadRequestError, 'BadRequestError')) {
    response.status(HttpStatus.BAD_REQUEST).sendJson({ message: errorMessage(error) })
    return
  }

  if (isErrorOfType(error, InvalidCredentialsError, 'InvalidCredentialsError')) {
    response.status(HttpStatus.UNAUTHORIZED).sendJson({ message: 'Unauthorized' })
    return
  }

  if (
    isErrorOfType(error, InitialSetupAlreadyCompletedError, 'InitialSetupAlreadyCompletedError')
  ) {
    response.status(HttpStatus.CONFLICT).sendJson({
      message: errorMessage(error),
    })
    return
  }

  if (isErrorOfType(error, ConflictError, 'ConflictError')) {
    response.status(HttpStatus.CONFLICT).sendJson({ message: errorMessage(error) })
    return
  }

  if (isErrorOfType(error, UnauthorizedError, 'UnauthorizedError')) {
    response.status(HttpStatus.UNAUTHORIZED).sendJson({ message: 'Unauthorized' })
    return
  }

  if (isErrorOfType(error, ExternalServiceError, 'ExternalServiceError')) {
    response.status(HttpStatus.BAD_GATEWAY).sendJson({ message: errorMessage(error) })
    return
  }

  if (
    isErrorOfType(error, DomainError, 'DomainError') ||
    isErrorOfType(error, ApplicationError, 'ApplicationError')
  ) {
    response.status(HttpStatus.BAD_REQUEST).sendJson({ message: errorMessage(error) })
    return
  }

  response.status(HttpStatus.INTERNAL_SERVER_ERROR).sendJson({
    message: 'Unexpected internal error',
  })
}

function isErrorOfType<T extends Error>(
  error: unknown,
  errorClass: new (...args: never[]) => T,
  name: string,
): boolean {
  return error instanceof errorClass || (error instanceof Error && error.name === name)
}

function errorMessage(error: unknown): string {
  return error instanceof Error ? error.message : 'Unexpected internal error'
}
