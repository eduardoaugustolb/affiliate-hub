'use client'

import { useRouter } from 'next/navigation'
import { createContext, type ReactNode, useContext, useEffect, useMemo, useState } from 'react'
import { ApiError } from '@/lib/api/errors'
import { type AuthUser, getSession, logout as logoutRequest } from '../api/authApi'

type SessionState = {
  user: AuthUser | null
  loading: boolean
  refresh: () => Promise<AuthUser | null>
  logout: () => Promise<void>
}

const SessionContext = createContext<SessionState | null>(null)

export function SessionProvider({ children }: { children: ReactNode }) {
  const router = useRouter()
  const [user, setUser] = useState<AuthUser | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let active = true
    getSession()
      .then(({ user: currentUser }) => {
        if (active) setUser(currentUser)
      })
      .catch((error: unknown) => {
        if (active && (!(error instanceof ApiError) || error.status === 401)) setUser(null)
      })
      .finally(() => {
        if (active) setLoading(false)
      })
    return () => {
      active = false
    }
  }, [])

  const value = useMemo<SessionState>(
    () => ({
      user,
      loading,
      refresh: async () => {
        try {
          const { user: currentUser } = await getSession()
          setUser(currentUser)
          return currentUser
        } catch (error) {
          if (error instanceof ApiError && error.status !== 401) throw error
          setUser(null)
          return null
        }
      },
      logout: async () => {
        try {
          await logoutRequest()
        } finally {
          setUser(null)
          router.replace('/login')
          router.refresh()
        }
      },
    }),
    [loading, router, user],
  )

  return <SessionContext.Provider value={value}>{children}</SessionContext.Provider>
}

export function useSession(): SessionState {
  const context = useContext(SessionContext)
  if (!context) throw new Error('useSession must be used within SessionProvider')
  return context
}
