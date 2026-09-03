import { apiFetch } from '@/lib/api/client'
import type { LoginInput, SetupInput } from '../schemas/auth'

export type AuthUser = { id: string; name: string; email: string }

type SessionResponse = { user: AuthUser }

export function setup(input: SetupInput): Promise<{ message: string }> {
  return apiFetch('/admin/setup', {
    method: 'POST',
    body: JSON.stringify(input),
  })
}

export function login(input: LoginInput): Promise<void> {
  return apiFetch('/session', { method: 'POST', body: JSON.stringify(input) })
}

export function getSession(): Promise<SessionResponse> {
  return apiFetch('/session')
}

export function logout(): Promise<void> {
  return apiFetch('/session/logout', { method: 'POST' })
}
