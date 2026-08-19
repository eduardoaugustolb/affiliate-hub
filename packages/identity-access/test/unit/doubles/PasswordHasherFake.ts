import type { PasswordHasher } from '../../../src/application/ports/PasswordHasher'

export class PasswordHasherFake implements PasswordHasher {
  async hash(password: string): Promise<string> {
    return `hashed:${password}`
  }

  async verify(password: string, hash: string): Promise<boolean> {
    return hash === `hashed:${password}`
  }
}
