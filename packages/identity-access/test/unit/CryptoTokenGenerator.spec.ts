import { describe, expect, it } from 'bun:test'
import { CryptoTokenGenerator } from '../../src/adapters/CryptoTokenGenerator'

describe('CryptoTokenGenerator', () => {
  it('generates non-empty base64url tokens', () => {
    const generator = new CryptoTokenGenerator()

    const first = generator.generate()
    const second = generator.generate()

    expect(first).toMatch(/^[A-Za-z0-9_-]+$/)
    expect(first).toHaveLength(43)
    expect(second).not.toBe(first)
  })
})
