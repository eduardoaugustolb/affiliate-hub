import { createCipheriv, createDecipheriv, randomBytes } from 'node:crypto'
import type { Cipher } from '@affiliate-hub/shared-kernel'

export class CipherAdapter implements Cipher {
  constructor(private readonly key: Buffer) {
    if (this.key.length !== 32) {
      throw new Error('Invalid key')
    }
  }
  async encrypt(data: string): Promise<{ ciphertext: string; iv: string; authTag: string }> {
    const iv = randomBytes(16)
    const cipher = createCipheriv('aes-256-gcm', this.key, iv)
    const ciphertext = cipher.update(data, 'utf8', 'hex') + cipher.final('hex')
    const authTag = cipher.getAuthTag().toString('hex')
    return {
      ciphertext,
      iv: iv.toString('hex'),
      authTag,
    }
  }

  async decrypt(data: string, iv: string, authTag: string): Promise<string> {
    const decipher = createDecipheriv('aes-256-gcm', this.key, Buffer.from(iv, 'hex'))
    decipher.setAuthTag(Buffer.from(authTag, 'hex'))
    return decipher.update(data, 'hex', 'utf8') + decipher.final('utf8')
  }
}
