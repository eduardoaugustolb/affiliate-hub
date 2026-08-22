import { ApplicationError } from '@affiliate-hub/shared-kernel'

export class InitialSetupAlreadyCompletedError extends ApplicationError {
  constructor() {
    super('Initial setup has already been completed')
    this.name = 'InitialSetupAlreadyCompletedError'
  }
}
