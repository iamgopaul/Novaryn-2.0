'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { FieldGroup, Field, FieldLabel, FieldError } from '@/components/ui/field'
import { Spinner } from '@/components/ui/spinner'
import { ArrowLeft } from 'lucide-react'

export default function NewTeamPage() {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const [form, setForm] = useState({
    name: '',
    description: '',
  })

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)
    setLoading(true)

    try {
      const supabase = createClient()
      const { data: { user } } = await supabase.auth.getUser()

      if (!user) {
        setError('You must be logged in')
        setLoading(false)
        return
      }

      // Create team
      const { data: team, error: teamError } = await supabase
        .from('teams')
        .insert({
          name: form.name,
          description: form.description || null,
          owner_id: user.id,
        })
        .select()
        .single()

      if (teamError) {
        setError(teamError.message)
        setLoading(false)
        return
      }

      // Add creator as owner member
      const { error: memberError } = await supabase
        .from('team_members')
        .insert({
          team_id: team.id,
          user_id: user.id,
          role: 'owner',
        })

      if (memberError) {
        setError(memberError.message)
        setLoading(false)
        return
      }

      router.push(`/teams/${team.id}`)
      router.refresh()
    } catch {
      setError('An unexpected error occurred')
      setLoading(false)
    }
  }

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <Link
        href="/teams"
        className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground"
      >
        <ArrowLeft className="h-4 w-4" />
        Back to teams
      </Link>

      <Card>
        <CardHeader>
          <CardTitle>Create New Team</CardTitle>
          <CardDescription>
            Create a team to collaborate with others on projects
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit}>
            <FieldGroup>
              <Field>
                <FieldLabel htmlFor="name">Team Name</FieldLabel>
                <Input
                  id="name"
                  placeholder="My Awesome Team"
                  value={form.name}
                  onChange={(e) => setForm({ ...form, name: e.target.value })}
                  required
                />
              </Field>

              <Field>
                <FieldLabel htmlFor="description">Description</FieldLabel>
                <Textarea
                  id="description"
                  placeholder="What is your team working on?"
                  rows={3}
                  value={form.description}
                  onChange={(e) => setForm({ ...form, description: e.target.value })}
                />
              </Field>

              {error && <FieldError>{error}</FieldError>}
            </FieldGroup>

            <div className="mt-6 flex gap-3">
              <Button type="submit" disabled={loading}>
                {loading ? <Spinner className="mr-2 h-4 w-4" /> : null}
                Create Team
              </Button>
              <Button type="button" variant="outline" asChild>
                <Link href="/teams">Cancel</Link>
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  )
}
