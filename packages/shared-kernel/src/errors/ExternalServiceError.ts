import { ApplicationError } from './ApplicationError'

export class ExternalServiceError extends ApplicationError {
  constructor(message: string, options?: { cause?: unknown }) {
    super(message)
    this.name = 'ExternalServiceError'
    if (options?.cause !== undefined) this.cause = options.cause
  }
}
