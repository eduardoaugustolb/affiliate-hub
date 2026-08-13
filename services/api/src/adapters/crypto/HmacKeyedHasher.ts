import { createHmac } from 'node:crypto'
import type { KeyedHasher } from '@affiliate-hub/shared-kernel'

export class HmacKeyedHasher implements KeyedHasher {
  constructor(private readonly key: string) {}

  async hash(data: string): Promise<string> {
    const hmac = createHmac('sha256', this.key)
    return hmac.update(data).digest('hex')
  }
}
