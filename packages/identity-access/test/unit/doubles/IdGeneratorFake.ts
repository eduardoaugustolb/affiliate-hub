import type { IdGenerator } from '@affiliate-hub/shared-kernel'

export class IdGeneratorFake implements IdGenerator {
  private sequence = 0

  generate(): string {
    this.sequence += 1
    return `fake-id-${this.sequence}`
  }
}
