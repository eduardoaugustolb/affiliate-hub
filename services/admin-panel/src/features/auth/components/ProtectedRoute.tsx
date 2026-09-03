'use client'

import { usePathname, useRouter } from 'next/navigation'
import { type ReactNode, useEffect } from 'react'
import { useSession } from '../session/SessionProvider'

export function ProtectedRoute({ children }: { children: ReactNode }) {
  const { user, loading } = useSession()
  const router = useRouter()
  const pathname = usePathname()

  useEffect(() => {
    if (!loading && !user && pathname !== '/login') {
      router.replace(`/login?returnTo=${encodeURIComponent(pathname)}`)
    }
  }, [loading, pathname, router, user])

  if (loading || !user) {
    return <main className="flex min-h-svh items-center justify-center">Carregando sessão...</main>
  }
  return children
}
