import { describe, expect, it } from 'bun:test'
import {
  authenticateUserBodySchema,
  productCreatedResponseSchema,
  userResponseSchema,
} from '../src'

describe('HTTP contracts', () => {
  it('accepts valid input and output payloads', () => {
    expect(
      authenticateUserBodySchema.parse({ email: 'user@example.com', password: 'secret' }),
    ).toEqual({
      email: 'user@example.com',
      password: 'secret',
    })
    expect(productCreatedResponseSchema.parse({ message: 'ok', productId: 'p-1' }).productId).toBe(
      'p-1',
    )
    expect(
      userResponseSchema.parse({
        message: 'ok',
        user: { id: 'u-1', email: 'user@example.com', name: 'User' },
      }).user.name,
    ).toBe('User')
  })

  it('rejects invalid request input and incompatible responses', () => {
    expect(() => authenticateUserBodySchema.parse({ email: 'invalid', password: '' })).toThrow()
    expect(() => productCreatedResponseSchema.parse({ message: 'ok', productId: 42 })).toThrow()
  })
})
