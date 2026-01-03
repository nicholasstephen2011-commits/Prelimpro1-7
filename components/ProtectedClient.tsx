'use client'

import { useEffect, useState } from 'react'
import { usePathname, useRouter } from 'next/navigation'
import { supabase } from '../lib/supabaseClient'

const PUBLIC_PATH_PREFIXES = ['/', '/auth', '/login', '/signup', '/verify-email', '/forgot-password', '/privacy', '/terms']
const PROTECTED_PATH_PREFIXES = ['/settings', '/templates', '/new-notice', '/mock-customer-portal', '/dashboard', '/upgrade', '/app']

function isPublicPath(pathname: string): boolean {
  if (!pathname) return false
  if (pathname.startsWith('/_next') || pathname.startsWith('/api') || pathname.startsWith('/favicon') || pathname.startsWith('/public')) return true
  return PUBLIC_PATH_PREFIXES.some((prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`))
}

function isProtectedPath(pathname: string): boolean {
  if (!pathname) return false
  return PROTECTED_PATH_PREFIXES.some((prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`))
}

export default function ProtectedClient({ children }: { children: React.ReactNode }) {
  const pathname = usePathname() || '/'
  const router = useRouter()
  const [authorized, setAuthorized] = useState(false)
  const [checking, setChecking] = useState(true)

  useEffect(() => {
    let active = true

    const guard = async () => {
      // Public routes are always allowed
      if (isPublicPath(pathname) && !isProtectedPath(pathname)) {
        setAuthorized(true)
        setChecking(false)
        return
      }

      // Only check auth on protected paths
      if (!isProtectedPath(pathname)) {
        setAuthorized(true)
        setChecking(false)
        return
      }

      try {
        const { data, error } = await supabase.auth.getSession()
        if (!active) return

        if (error || !data?.session) {
          const redirect = encodeURIComponent(pathname)
          router.replace(`/auth?redirect=${redirect}&error=auth_required`)
          return
        }

        setAuthorized(true)
      } catch {
        if (!active) return
        const redirect = encodeURIComponent(pathname)
        router.replace(`/auth?redirect=${redirect}&error=auth_required`)
      }
      setChecking(false)
    }

    guard()

    return () => {
      active = false
    }
  }, [pathname, router])

  if (!authorized || checking) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gray-50 text-sm text-gray-600">
        Checking your session…
      </div>
    )
  }

  return <>{children}</>
}
