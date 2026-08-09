import type { TokenHasher } from '../../src/application/ports/TokenHasher'

export class TokenHasherFake implements TokenHasher {
  hash(token: string): string {
    return `hashed:${token}`
  }
}
