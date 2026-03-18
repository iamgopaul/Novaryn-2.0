'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Snippet } from '@/lib/types'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { FieldGroup, Field, FieldLabel } from '@/components/ui/field'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Spinner } from '@/components/ui/spinner'
import { Plus, Copy, Trash2, Search, Bookmark, Code2 } from 'lucide-react'

const languages = [
  'javascript', 'typescript', 'python', 'html', 'css', 'sql', 'json', 'markdown', 'bash', 'go', 'rust'
]

export default function SnippetsPage() {
  const [snippets, setSnippets] = useState<Snippet[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [isOpen, setIsOpen] = useState(false)
  const [saving, setSaving] = useState(false)

  const [newSnippet, setNewSnippet] = useState({
    title: '',
    description: '',
    code: '',
    language: 'javascript',
    tags: '',
    is_public: false,
  })

  const supabase = createClient()

  const fetchSnippets = async () => {
    setLoading(true)
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return

    const { data } = await supabase
      .from('snippets')
      .select('*')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })

    setSnippets(data || [])
    setLoading(false)
  }

  useEffect(() => {
    fetchSnippets()
  }, [])

  const handleCreate = async () => {
    setSaving(true)
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return

    const tags = newSnippet.tags.split(',').map(t => t.trim()).filter(Boolean)

    const { error } = await supabase.from('snippets').insert({
      user_id: user.id,
      title: newSnippet.title,
      description: newSnippet.description || null,
      code: newSnippet.code,
      language: newSnippet.language,
      tags,
      is_public: newSnippet.is_public,
    })

    if (!error) {
      setNewSnippet({
        title: '',
        description: '',
        code: '',
        language: 'javascript',
        tags: '',
        is_public: false,
      })
      setIsOpen(false)
      fetchSnippets()
    }
    setSaving(false)
  }

  const handleDelete = async (id: string) => {
    await supabase.from('snippets').delete().eq('id', id)
    fetchSnippets()
  }

  const handleCopy = async (code: string) => {
    await navigator.clipboard.writeText(code)
  }

  const filteredSnippets = snippets.filter(s =>
    s.title.toLowerCase().includes(search.toLowerCase()) ||
    s.tags.some(t => t.toLowerCase().includes(search.toLowerCase())) ||
    s.language.toLowerCase().includes(search.toLowerCase())
  )

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Bookmark className="h-6 w-6 text-primary" />
          <h1 className="text-2xl font-bold">Snippet Manager</h1>
        </div>
        <Dialog open={isOpen} onOpenChange={setIsOpen}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="mr-2 h-4 w-4" />
              New Snippet
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>Create New Snippet</DialogTitle>
            </DialogHeader>
            <FieldGroup>
              <Field>
                <FieldLabel>Title</FieldLabel>
                <Input
                  value={newSnippet.title}
                  onChange={(e) => setNewSnippet({ ...newSnippet, title: e.target.value })}
                  placeholder="My awesome snippet"
                />
              </Field>
              <Field>
                <FieldLabel>Description</FieldLabel>
                <Input
                  value={newSnippet.description}
                  onChange={(e) => setNewSnippet({ ...newSnippet, description: e.target.value })}
                  placeholder="What does this snippet do?"
                />
              </Field>
              <div className="grid gap-4 sm:grid-cols-2">
                <Field>
                  <FieldLabel>Language</FieldLabel>
                  <Select
                    value={newSnippet.language}
                    onValueChange={(value) => setNewSnippet({ ...newSnippet, language: value })}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {languages.map((lang) => (
                        <SelectItem key={lang} value={lang} className="capitalize">
                          {lang}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </Field>
                <Field>
                  <FieldLabel>Tags (comma separated)</FieldLabel>
                  <Input
                    value={newSnippet.tags}
                    onChange={(e) => setNewSnippet({ ...newSnippet, tags: e.target.value })}
                    placeholder="utility, helper, api"
                  />
                </Field>
              </div>
              <Field>
                <FieldLabel>Code</FieldLabel>
                <Textarea
                  value={newSnippet.code}
                  onChange={(e) => setNewSnippet({ ...newSnippet, code: e.target.value })}
                  placeholder="Paste your code here..."
                  rows={10}
                  className="font-mono"
                />
              </Field>
            </FieldGroup>
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setIsOpen(false)}>
                Cancel
              </Button>
              <Button onClick={handleCreate} disabled={saving || !newSnippet.title || !newSnippet.code}>
                {saving ? <Spinner className="mr-2 h-4 w-4" /> : null}
                Save Snippet
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      <div className="relative">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          placeholder="Search snippets by title, tag, or language..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="pl-10"
        />
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-12">
          <Spinner className="h-8 w-8" />
        </div>
      ) : filteredSnippets.length > 0 ? (
        <div className="grid gap-4 md:grid-cols-2">
          {filteredSnippets.map((snippet) => (
            <Card key={snippet.id}>
              <CardHeader className="pb-3">
                <div className="flex items-start justify-between">
                  <div>
                    <CardTitle className="text-lg">{snippet.title}</CardTitle>
                    <CardDescription>{snippet.description}</CardDescription>
                  </div>
                  <Badge variant="secondary" className="capitalize">
                    {snippet.language}
                  </Badge>
                </div>
              </CardHeader>
              <CardContent className="space-y-3">
                <pre className="max-h-32 overflow-auto rounded-lg bg-muted p-3 font-mono text-sm">
                  {snippet.code}
                </pre>
                <div className="flex flex-wrap gap-1">
                  {snippet.tags.map((tag) => (
                    <Badge key={tag} variant="outline" className="text-xs">
                      {tag}
                    </Badge>
                  ))}
                </div>
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleCopy(snippet.code)}
                  >
                    <Copy className="mr-2 h-3 w-3" />
                    Copy
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleDelete(snippet.id)}
                  >
                    <Trash2 className="mr-2 h-3 w-3" />
                    Delete
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      ) : (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <Code2 className="h-12 w-12 text-muted-foreground/50" />
            <h3 className="mt-4 text-lg font-medium">No snippets yet</h3>
            <p className="mt-1 text-center text-sm text-muted-foreground">
              Save your favorite code snippets for quick access
            </p>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
