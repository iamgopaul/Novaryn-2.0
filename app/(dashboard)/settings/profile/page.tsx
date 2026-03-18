'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'
import { Profile } from '@/lib/types'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { FieldGroup, Field, FieldLabel, FieldError } from '@/components/ui/field'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Spinner } from '@/components/ui/spinner'
import { ArrowLeft, Upload } from 'lucide-react'

export default function ProfileSettingsPage() {
  const router = useRouter()
  const [profile, setProfile] = useState<Profile | null>(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState(false)

  const [form, setForm] = useState({
    display_name: '',
    username: '',
    bio: '',
    avatar_url: '',
  })

  const supabase = createClient()

  useEffect(() => {
    const fetchProfile = async () => {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return

      const { data } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', user.id)
        .single()

      if (data) {
        setProfile(data)
        setForm({
          display_name: data.display_name || '',
          username: data.username || '',
          bio: data.bio || '',
          avatar_url: data.avatar_url || '',
        })
      }
      setLoading(false)
    }

    fetchProfile()
  }, [supabase])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)
    setSuccess(false)
    setSaving(true)

    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) {
        setError('You must be logged in')
        setSaving(false)
        return
      }

      // Check if username is taken by another user
      if (form.username !== profile?.username) {
        const { data: existingUser } = await supabase
          .from('profiles')
          .select('id')
          .eq('username', form.username.toLowerCase())
          .neq('id', user.id)
          .single()

        if (existingUser) {
          setError('Username is already taken')
          setSaving(false)
          return
        }
      }

      const { error: updateError } = await supabase
        .from('profiles')
        .update({
          display_name: form.display_name || null,
          username: form.username.toLowerCase() || null,
          bio: form.bio || null,
          avatar_url: form.avatar_url || null,
          updated_at: new Date().toISOString(),
        })
        .eq('id', user.id)

      if (updateError) {
        setError(updateError.message)
        setSaving(false)
        return
      }

      setSuccess(true)
      router.refresh()
    } catch {
      setError('An unexpected error occurred')
    } finally {
      setSaving(false)
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Spinner className="h-8 w-8" />
      </div>
    )
  }

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <Link
        href="/settings"
        className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground"
      >
        <ArrowLeft className="h-4 w-4" />
        Back to settings
      </Link>

      <Card>
        <CardHeader>
          <CardTitle>Profile Settings</CardTitle>
          <CardDescription>
            Update your personal information and public profile
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit}>
            <FieldGroup>
              {/* Avatar Preview */}
              <div className="flex items-center gap-4">
                <Avatar className="h-20 w-20">
                  <AvatarImage src={form.avatar_url || undefined} />
                  <AvatarFallback className="text-lg">
                    {form.display_name?.slice(0, 2).toUpperCase() || 'U'}
                  </AvatarFallback>
                </Avatar>
                <div className="flex-1">
                  <Field>
                    <FieldLabel htmlFor="avatar_url">Avatar URL</FieldLabel>
                    <Input
                      id="avatar_url"
                      type="url"
                      placeholder="https://example.com/avatar.jpg"
                      value={form.avatar_url}
                      onChange={(e) => setForm({ ...form, avatar_url: e.target.value })}
                    />
                  </Field>
                </div>
              </div>

              <Field>
                <FieldLabel htmlFor="display_name">Display Name</FieldLabel>
                <Input
                  id="display_name"
                  placeholder="John Doe"
                  value={form.display_name}
                  onChange={(e) => setForm({ ...form, display_name: e.target.value })}
                />
              </Field>

              <Field>
                <FieldLabel htmlFor="username">Username</FieldLabel>
                <Input
                  id="username"
                  placeholder="johndoe"
                  value={form.username}
                  onChange={(e) => setForm({ ...form, username: e.target.value.toLowerCase().replace(/[^a-z0-9_]/g, '') })}
                />
              </Field>

              <Field>
                <FieldLabel htmlFor="bio">Bio</FieldLabel>
                <Textarea
                  id="bio"
                  placeholder="Tell us about yourself..."
                  rows={3}
                  value={form.bio}
                  onChange={(e) => setForm({ ...form, bio: e.target.value })}
                />
              </Field>

              {error && <FieldError>{error}</FieldError>}
              {success && (
                <p className="text-sm text-green-600">Profile updated successfully!</p>
              )}
            </FieldGroup>

            <div className="mt-6 flex gap-3">
              <Button type="submit" disabled={saving}>
                {saving ? <Spinner className="mr-2 h-4 w-4" /> : null}
                Save Changes
              </Button>
              <Button type="button" variant="outline" asChild>
                <Link href="/settings">Cancel</Link>
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  )
}
