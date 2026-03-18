import { useEffect } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { createClient } from '@/lib/supabase/client'
import { logger } from '@/lib/logger'

export function AuthCallback() {
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()

  useEffect(() => {
    const run = async () => {
      const code = searchParams.get('code')
      const next = searchParams.get('next') ?? '/dashboard'
      if (code) {
        try {
          const supabase = createClient()
          const { error } = await supabase.auth.exchangeCodeForSession(code)
          if (!error) {
            navigate(next, { replace: true })
            return
          }
          logger.error('Auth callback: exchangeCodeForSession failed', 'AuthCallback', error)
        } catch (err) {
          logger.error('Auth callback failed', 'AuthCallback', err)
        }
      }
      navigate('/auth/error?error=Could not authenticate user', { replace: true })
    }
    run()
  }, [navigate, searchParams])

  return (
    <div className="flex min-h-screen items-center justify-center">
      <div className="h-8 w-8 animate-spin rounded-full border-2 border-primary border-t-transparent" />
    </div>
  )
}
