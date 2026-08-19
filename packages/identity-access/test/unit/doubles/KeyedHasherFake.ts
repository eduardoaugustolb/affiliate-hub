import type { KeyedHasher } from '@affiliate-hub/shared-kernel'

export class KeyedHasherFake implements KeyedHasher {
  async hash(token: string): Promise<string> {
    return `hashed:${token}`
  }
}
