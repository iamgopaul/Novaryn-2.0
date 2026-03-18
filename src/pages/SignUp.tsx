import { useState } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { FieldGroup, Field, FieldLabel, FieldError } from '@/components/ui/field'
import { Spinner } from '@/components/ui/spinner'
import { NovarynLogo } from '@/components/novaryn-logo'

export function SignUp() {
  const navigate = useNavigate()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [displayName, setDisplayName] = useState('')
  const [username, setUsername] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

  const handleSignUp = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)
    if (password !== confirmPassword) { setError('Passwords do not match'); return }
    if (password.length < 8) { setError('Password must be at least 8 characters'); return }
    if (username.length < 3) { setError('Username must be at least 3 characters'); return }
    setLoading(true)
    try {
      const supabase = createClient()
      const { data: existingUser } = await supabase.from('profiles').select('username').eq('username', username.toLowerCase()).single()
      if (existingUser) { setError('Username is already taken'); setLoading(false); return }
      const { error: signUpError } = await supabase.auth.signUp({
        email,
        password,
        options: {
          emailRedirectTo: `${window.location.origin}/auth/callback`,
          data: { display_name: displayName, username: username.toLowerCase() },
        },
      })
      if (signUpError) { setError(signUpError.message); setLoading(false); return }
      navigate('/auth/sign-up-success')
    } catch (err) {
      console.error('Sign up error:', err)
      const message = err instanceof Error ? err.message : 'An unexpected error occurred'
      setError(message)
      setLoading(false)
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4 py-12">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <div className="mx-auto mb-4">
            <NovarynLogo className="h-10 w-10" />
          </div>
          <CardTitle className="text-2xl">Create your account</CardTitle>
          <CardDescription>Join Novaryn and start building amazing software</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSignUp}>
            <FieldGroup>
              <Field>
                <FieldLabel htmlFor="email">Email</FieldLabel>
                <Input id="email" type="email" placeholder="you@example.com" value={email} onChange={(e) => setEmail(e.target.value)} required />
              </Field>
              <Field>
                <FieldLabel htmlFor="password">Password</FieldLabel>
                <Input id="password" type="password" placeholder="At least 8 characters" value={password} onChange={(e) => setPassword(e.target.value)} required />
              </Field>
              <Field>
                <FieldLabel htmlFor="confirmPassword">Confirm Password</FieldLabel>
                <Input id="confirmPassword" type="password" placeholder="Confirm password" value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} required />
              </Field>
              <Field>
                <FieldLabel htmlFor="displayName">Display Name</FieldLabel>
                <Input id="displayName" type="text" placeholder="Your name" value={displayName} onChange={(e) => setDisplayName(e.target.value)} />
              </Field>
              <Field>
                <FieldLabel htmlFor="username">Username</FieldLabel>
                <Input id="username" type="text" placeholder="username" value={username} onChange={(e) => setUsername(e.target.value)} required />
                {error && <FieldError>{error}</FieldError>}
              </Field>
            </FieldGroup>
            <Button type="submit" className="mt-6 w-full" disabled={loading}>
              {loading ? <Spinner className="mr-2 h-4 w-4" /> : null}
              Create account
            </Button>
          </form>
          <div className="mt-6 text-center text-sm text-muted-foreground">
            Already have an account? <Link to="/auth/login" className="font-medium text-primary hover:underline">Sign in</Link>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
