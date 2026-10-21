'use client'

import { useCallback } from 'react'
import { useRouter } from '@/i18n/routing'

/** Navigates after sign-in; /admin lives outside the locale routes, so it gets a full page load */
export function useAuthNavigate() {
  const router = useRouter()
  return useCallback(
    (path: string) => {
      if (path.startsWith('/admin')) {
        window.location.assign(path)
        return
      }
      router.push(path)
      router.refresh()
    },
    [router]
  )
}
