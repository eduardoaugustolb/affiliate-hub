import { describe, expect, it } from 'bun:test'
import { IdGeneratorBun } from '../../src/adapters/crypto/IdGeneratorBun'

describe('IdGeneratorBun', () => {
  it('generates distinct UUID version 7 identifiers', () => {
    const generator = new IdGeneratorBun()

    const first = generator.generate()
    const second = generator.generate()

    expect(first).toMatch(/^[0-9a-f]{8}-[0-9a-f]{4}-7[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/)
    expect(second).not.toBe(first)
  })
})
