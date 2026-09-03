import { afterEach, beforeEach, describe, expect, it, mock } from 'bun:test'
import { apiFetch } from '../src/lib/api/client'
import { ApiError, toApiError } from '../src/lib/api/errors'

describe('admin panel API client', () => {
  const originalFetch = globalThis.fetch

  beforeEach(() => {
    globalThis.fetch = mock(
      async () => new Response(JSON.stringify({ ok: true }), { status: 200 }),
    ) as unknown as typeof fetch
  })

  afterEach(() => {
    globalThis.fetch = originalFetch
  })

  it('sends credentials so the browser manages the HttpOnly cookie', async () => {
    await apiFetch('/session')
    expect(globalThis.fetch).toHaveBeenCalledWith(
      'http://localhost:3001/session',
      expect.objectContaining({ credentials: 'include' }),
    )
  })

  it('maps an expired session to a safe ApiError', async () => {
    const error = await toApiError(
      new Response(JSON.stringify({ message: 'Unauthorized' }), {
        status: 401,
      }),
    )
    expect(error).toBeInstanceOf(ApiError)
    expect(error.status).toBe(401)
    expect(error.message).toBe('Unauthorized')
  })
})
