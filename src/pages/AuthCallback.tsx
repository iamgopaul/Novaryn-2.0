import { useEffect } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { createClient } from '@/lib/supabase/client'

export function AuthCallback() {
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()

  useEffect(() => {
    const run = async () => {
      const code = searchParams.get('code')
      const next = searchParams.get('next') ?? '/dashboard'
      if (code) {
        const supabase = createClient()
        const { error } = await supabase.auth.exchangeCodeForSession(code)
        if (!error) {
          navigate(next, { replace: true })
          return
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
