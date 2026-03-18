import { useState } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { FieldGroup, Field, FieldLabel, FieldError } from '@/components/ui/field'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Spinner } from '@/components/ui/spinner'
import { ArrowLeft } from 'lucide-react'

export function NewProject() {
  const navigate = useNavigate()
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [form, setForm] = useState({
    name: '',
    description: '',
    status: 'planning',
    priority: 'medium',
    target_date: '',
  })

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)
    setLoading(true)
    try {
      const supabase = createClient()
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) { setError('You must be logged in'); setLoading(false); return }

      const { error: insertError } = await supabase.from('projects').insert({
        user_id: user.id,
        name: form.name,
        description: form.description || null,
        status: form.status,
        priority: form.priority,
        target_date: form.target_date || null,
      })

      if (insertError) { setError(insertError.message); setLoading(false); return }
      navigate('/projects')
    } catch { setError('An unexpected error occurred'); setLoading(false) }
  }

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <Link to="/projects" className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground">
        <ArrowLeft className="h-4 w-4" />
        Back to projects
      </Link>

      <Card>
        <CardHeader>
          <CardTitle>Create New Project</CardTitle>
          <CardDescription>Start a new development project and track its progress through the SDLC</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit}>
            <FieldGroup>
              <Field>
                <FieldLabel htmlFor="name">Project Name</FieldLabel>
                <Input id="name" placeholder="My Awesome Project" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} required />
              </Field>
              <Field>
                <FieldLabel htmlFor="description">Description</FieldLabel>
                <Textarea id="description" placeholder="Describe your project..." rows={3} value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} />
              </Field>
              <div className="grid gap-4 sm:grid-cols-2">
                <Field>
                  <FieldLabel>Status</FieldLabel>
                  <Select value={form.status} onValueChange={(value) => setForm({ ...form, status: value })}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="planning">Planning</SelectItem>
                      <SelectItem value="design">Design</SelectItem>
                      <SelectItem value="development">Development</SelectItem>
                      <SelectItem value="testing">Testing</SelectItem>
                      <SelectItem value="review">Review</SelectItem>
                      <SelectItem value="deployment">Deployment</SelectItem>
                    </SelectContent>
                  </Select>
                </Field>
                <Field>
                  <FieldLabel>Priority</FieldLabel>
                  <Select value={form.priority} onValueChange={(value) => setForm({ ...form, priority: value })}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="low">Low</SelectItem>
                      <SelectItem value="medium">Medium</SelectItem>
                      <SelectItem value="high">High</SelectItem>
                      <SelectItem value="critical">Critical</SelectItem>
                    </SelectContent>
                  </Select>
                </Field>
              </div>
              <Field>
                <FieldLabel htmlFor="target_date">Target Date</FieldLabel>
                <Input id="target_date" type="date" value={form.target_date} onChange={(e) => setForm({ ...form, target_date: e.target.value })} />
              </Field>
              {error && <FieldError>{error}</FieldError>}
            </FieldGroup>
            <div className="mt-6 flex gap-3">
              <Button type="submit" disabled={loading}>
                {loading ? <Spinner className="mr-2 h-4 w-4" /> : null}
                Create Project
              </Button>
              <Button type="button" variant="outline" asChild>
                <Link to="/projects">Cancel</Link>
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  )
}
