import type { UseCase } from '@affiliate-hub/shared-kernel'
import type { ClickLog } from '../ports/ClickLog'

export interface RegisterClickInput {
  productId: string
}

export type RegisterClickOutput = Record<string, never>

export class RegisterClick implements UseCase<RegisterClickInput, RegisterClickOutput> {
  constructor(private readonly clickLog: ClickLog) {}

  async execute(input: RegisterClickInput): Promise<RegisterClickOutput> {
    await this.clickLog.register({ productId: input.productId, clickedAt: new Date() })
    return {}
  }
}
