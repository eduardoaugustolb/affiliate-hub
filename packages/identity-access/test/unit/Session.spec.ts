import { describe, expect, it } from 'bun:test'
import { Session } from '../../src/domain/Session'

describe('Session', () => {
  it('creates a session and exposes its identity, expiry and snapshot', () => {
    const expiresAt = new Date('2026-08-20T12:00:00.000Z')
    const session = Session.create('SESSION-1', {
      tokenHash: 'hash-1',
      userId: 'USER-1',
      expiresAt,
    })

    expect(session.getId()).toBe('SESSION-1')
    expect(session.getTokenHash()).toBe('hash-1')
    expect(session.getUserId()).toBe('USER-1')
    expect(session.getExpiresAt()).toBe(expiresAt)
    expect(session.getCreatedAt()).toBeInstanceOf(Date)
    expect(session.toSnapshot()).toMatchObject({
      id: 'SESSION-1',
      tokenHash: 'hash-1',
      userId: 'USER-1',
      expiresAt,
    })
  })

  it('evaluates expiration and equality from explicit session identity', () => {
    const past = new Date('2026-08-10T12:00:00.000Z')
    const future = new Date('2026-08-20T12:00:00.000Z')
    const session = Session.create('SESSION-1', {
      tokenHash: 'hash-1',
      userId: 'USER-1',
      expiresAt: future,
    })

    expect(session.isExpired(past)).toBe(false)
    expect(session.isExpired(future)).toBe(true)
    expect(session.equals(Session.rehydrate(session.toSnapshot()))).toBe(true)
    expect(
      session.equals(
        Session.create('SESSION-2', { tokenHash: 'hash-1', userId: 'USER-1', expiresAt: future }),
      ),
    ).toBe(false)
  })
})
