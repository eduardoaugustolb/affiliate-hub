import { randomBytes } from 'node:crypto'
import type { TokenGenerator } from '../application/ports/TokenGenerator'

export class CryptoTokenGenerator implements TokenGenerator {
  generate(): string {
    const token = randomBytes(32).toString('base64url')
    return token
  }
}
