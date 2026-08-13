import { ApplicationError } from '@affiliate-hub/shared-kernel'

export class UserAlreadyExistsError extends ApplicationError {
  constructor(message: string) {
    super(message)
    this.name = 'UserAlreadyExistsError'
  }
}
