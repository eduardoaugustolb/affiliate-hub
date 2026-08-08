import type { IdGenerator } from '@affiliate-hub/shared-kernel'

export class IdGeneratorBun implements IdGenerator {
  generate(): string {
    return Bun.randomUUIDv7()
  }
}
