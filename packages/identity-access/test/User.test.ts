import { describe, expect, it } from 'bun:test'
import { User } from '../src/domain/User'

describe('User', () => {
  it('compares users by identity', () => {
    const data = { email: 'jane@example.com', name: 'Jane', passwordHash: 'hash' }
    const user = User.create('USER-1', data)

    expect(user.equals(User.rehydrate(user.toSnapshot()))).toBe(true)
    expect(user.equals(User.create('USER-2', data))).toBe(false)
  })
})
