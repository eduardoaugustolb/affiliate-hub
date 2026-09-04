import type { Clock, UseCase } from '@affiliate-hub/shared-kernel'
import type { ClickLog } from '../ports/ClickLog'

export interface RegisterClickInput {
  productId: string
}

export type RegisterClickOutput = Record<string, never>

export class RegisterClick implements UseCase<RegisterClickInput, RegisterClickOutput> {
  constructor(
    private readonly clickLog: ClickLog,
    private readonly clock: Clock,
  ) {}

  async execute(input: RegisterClickInput): Promise<RegisterClickOutput> {
    await this.clickLog.register({ productId: input.productId, clickedAt: this.clock.now() })
    return {}
  }
}
