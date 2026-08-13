import { InvalidCredentialsError } from '@affiliate-hub/identity-access'
import {
  ApplicationError,
  BadRequestError,
  DomainError,
  type HttpResponse,
  HttpStatus,
  NotFoundError,
} from '@affiliate-hub/shared-kernel'

export function mapErrorToHttp(error: unknown, response: HttpResponse): void {
  if (error instanceof NotFoundError) {
    response.status(HttpStatus.NOT_FOUND).sendJson({ message: error.message })
    return
  }

  if (error instanceof BadRequestError) {
    response.status(HttpStatus.BAD_REQUEST).sendJson({ message: error.message })
    return
  }

  if (error instanceof InvalidCredentialsError) {
    response.status(HttpStatus.UNAUTHORIZED).sendJson({ message: 'Unauthorized' })
    return
  }

  if (error instanceof DomainError || error instanceof ApplicationError) {
    response.status(HttpStatus.BAD_REQUEST).sendJson({ message: error.message })
    return
  }
  response.status(HttpStatus.INTERNAL_SERVER_ERROR).sendJson({
    message: 'Unexpected internal error',
  })
}
