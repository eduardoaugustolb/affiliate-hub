import {
  ApplicationError,
  DomainError,
  type HttpResponse,
  NotFoundError,
} from '@affiliate-hub/shared-kernel'

export function mapErrorToHttp(error: unknown, response: HttpResponse): void {
  if (error instanceof NotFoundError) {
    response.status(404).send({ error: error.message })
    return
  }
  if (error instanceof DomainError || error instanceof ApplicationError) {
    response.status(400).send({ error: error.message })
    return
  }
  response.status(500).send({ error: 'Unexpected internal error' })
}
