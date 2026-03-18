import { useState, useEffect } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { FieldGroup, Field, FieldLabel, FieldError } from '@/components/ui/field'
import { Spinner } from '@/components/ui/spinner'
import { NovarynLogo } from '@/components/novaryn-logo'
import { logger } from '@/lib/logger'

export function Login() {
  const navigate = useNavigate()
  const [emailOrUsername, setEmailOrUsername] = useState('')
  const [password, setPassword] = useState('')
  const [email, setEmail] = useState('') // resolved email for 2FA (resend, API)
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const [requires2FA, setRequires2FA] = useState(false)
  const [twoFactorCode, setTwoFactorCode] = useState('')
  const [userId, setUserId] = useState<string | null>(null)
  const [resendCooldown, setResendCooldown] = useState(0)
  const [resendLoading, setResendLoading] = useState(false)

  // 30-second cooldown when on 2FA step
  useEffect(() => {
    if (!requires2FA || resendCooldown <= 0) return
    const t = setInterval(() => {
      setResendCooldown((s) => (s <= 1 ? 0 : s - 1))
    }, 1000)
    return () => clearInterval(t)
  }, [requires2FA, resendCooldown])

  const handleResendCode = async () => {
    if (!userId || !email || resendCooldown > 0 || resendLoading) return
    setResendLoading(true)
    setError(null)
    try {
      const res = await fetch('/api/auth/send-2fa', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId, email }),
      })
      const data = await res.json()
      if (!res.ok) {
        setError(data.error || 'Failed to resend code')
        setResendLoading(false)
        return
      }
      setResendCooldown(30)
    } catch (err) {
      logger.error('Resend 2FA code failed', 'Login', err)
      setError('Failed to resend code')
    }
    setResendLoading(false)
  }

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)
    setLoading(true)
    try {
      const supabase = createClient()
      const raw = emailOrUsername.trim()
      if (!raw) {
        setError('Enter your email or username')
        setLoading(false)
        return
      }

      let signInEmail: string
      if (raw.includes('@')) {
        signInEmail = raw
      } else {
        const { data: profile, error: profileError } = await supabase
          .from('profiles')
          .select('email')
          .ilike('username', raw.toLowerCase())
          .maybeSingle()
        if (profileError || !profile?.email) {
          setError('No account found with that username')
          setLoading(false)
          return
        }
        signInEmail = profile.email
      }

      const { data, error: signInError } = await supabase.auth.signInWithPassword({ email: signInEmail, password })
      if (signInError) {
        setError(signInError.message)
        setLoading(false)
        return
      }
      if (data.user) {
        setEmail(data.user.email ?? signInEmail)
        const { data: profile } = await supabase.from('profiles').select('two_factor_enabled').eq('id', data.user.id).single()
        if (profile?.two_factor_enabled) {
          setUserId(data.user.id)
          await fetch('/api/auth/send-2fa', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ userId: data.user.id, email: data.user.email ?? signInEmail }),
          })
          setRequires2FA(true)
          setResendCooldown(30)
          setLoading(false)
        } else {
          navigate('/dashboard')
        }
      }
    } catch (err) {
      logger.error('Login failed', 'Login', err)
      setError('An unexpected error occurred')
      setLoading(false)
    }
  }

  const handleVerify2FA = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)
    setLoading(true)
    try {
      const response = await fetch('/api/auth/verify-2fa', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId, code: twoFactorCode }),
      })
      const result = await response.json()
      if (!response.ok) {
        setError(result.error || 'Invalid verification code')
        setLoading(false)
        return
      }
      navigate('/dashboard')
    } catch (err) {
      logger.error('2FA verification failed', 'Login', err)
      setError('An unexpected error occurred')
      setLoading(false)
    }
  }

  if (requires2FA) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background px-3 py-6 sm:px-4 sm:py-8">
        <Card className="w-full max-w-md">
          <CardHeader className="text-center">
            <div className="mx-auto mb-4">
              <NovarynLogo className="h-10 w-10" />
            </div>
            <CardTitle className="text-2xl">Two-Factor Authentication</CardTitle>
            <CardDescription>We sent a verification code to your email. Please enter it below.</CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleVerify2FA}>
              <FieldGroup>
                <Field>
                  <FieldLabel htmlFor="code">Verification Code</FieldLabel>
                  <Input
                    id="code"
                    type="text"
                    placeholder="Enter 6-digit code"
                    value={twoFactorCode}
                    onChange={(e) => setTwoFactorCode(e.target.value)}
                    maxLength={6}
                    className="text-center text-lg tracking-widest"
                    required
                  />
                  {error && <FieldError>{error}</FieldError>}
                </Field>
              </FieldGroup>
              <Button type="submit" className="mt-6 w-full" disabled={loading}>
                {loading ? <Spinner className="mr-2 h-4 w-4" /> : null}
                Verify
              </Button>
              <div className="mt-4 flex flex-col items-center gap-2">
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="text-muted-foreground hover:text-foreground"
                  disabled={resendCooldown > 0 || resendLoading}
                  onClick={handleResendCode}
                >
                  {resendLoading ? (
                    <Spinner className="mr-2 h-3.5 w-3.5" />
                  ) : null}
                  {resendCooldown > 0
                    ? `Resend code in ${resendCooldown}s`
                    : 'Resend code'}
                </Button>
                <Button variant="link" className="w-full" onClick={() => { setRequires2FA(false); setTwoFactorCode(''); setResendCooldown(0) }}>
                  Back to login
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-3 py-6 sm:px-4 sm:py-8">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <div className="mx-auto mb-4">
            <NovarynLogo className="h-10 w-10" />
          </div>
          <CardTitle className="text-2xl">Welcome back</CardTitle>
          <CardDescription>Sign in to your Novaryn account to continue</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleLogin}>
            <FieldGroup>
              <Field>
                <FieldLabel htmlFor="emailOrUsername">Email or username</FieldLabel>
                <Input
                  id="emailOrUsername"
                  type="text"
                  autoComplete="username"
                  placeholder="you@example.com or username"
                  value={emailOrUsername}
                  onChange={(e) => setEmailOrUsername(e.target.value)}
                  required
                />
              </Field>
              <Field>
                <FieldLabel htmlFor="password">Password</FieldLabel>
                <Input id="password" type="password" placeholder="Enter your password" value={password} onChange={(e) => setPassword(e.target.value)} required />
                {error && <FieldError>{error}</FieldError>}
              </Field>
            </FieldGroup>
            <Button type="submit" className="mt-6 w-full" disabled={loading}>
              {loading ? <Spinner className="mr-2 h-4 w-4" /> : null}
              Sign In
            </Button>
          </form>
          <div className="mt-6 text-center text-sm text-muted-foreground">
            Don&apos;t have an account? <Link to="/auth/sign-up" className="font-medium text-primary hover:underline">Sign up</Link>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
