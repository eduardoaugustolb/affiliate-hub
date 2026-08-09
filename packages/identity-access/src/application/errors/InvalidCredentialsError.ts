import { ApplicationError } from '@affiliate-hub/shared-kernel'

export class InvalidCredentialsError extends ApplicationError {
  constructor(message: string) {
    super(message)
    this.name = 'InvalidCredentialsError'
  }
}
