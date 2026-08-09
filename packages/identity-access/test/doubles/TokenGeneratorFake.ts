import type { TokenGenerator } from '../../src/application/ports/TokenGenerator'

export class TokenGeneratorFake implements TokenGenerator {
  private sequence = 0

  generate(): string {
    this.sequence += 1
    return `fake-token-${this.sequence}`
  }
}
