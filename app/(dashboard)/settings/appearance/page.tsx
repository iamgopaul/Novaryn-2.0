'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { useTheme } from 'next-themes'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { FieldGroup, Field, FieldLabel } from '@/components/ui/field'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Spinner } from '@/components/ui/spinner'
import { ArrowLeft, Monitor, Moon, Sun, Check } from 'lucide-react'
import { cn } from '@/lib/utils'

const accentColors = [
  { name: 'Cyan', value: '#0891b2', class: 'bg-cyan-600' },
  { name: 'Blue', value: '#2563eb', class: 'bg-blue-600' },
  { name: 'Violet', value: '#7c3aed', class: 'bg-violet-600' },
  { name: 'Pink', value: '#db2777', class: 'bg-pink-600' },
  { name: 'Rose', value: '#e11d48', class: 'bg-rose-600' },
  { name: 'Orange', value: '#ea580c', class: 'bg-orange-600' },
  { name: 'Green', value: '#16a34a', class: 'bg-green-600' },
  { name: 'Teal', value: '#0d9488', class: 'bg-teal-600' },
]

const themes = [
  { value: 'light', label: 'Light', icon: Sun },
  { value: 'dark', label: 'Dark', icon: Moon },
  { value: 'system', label: 'System', icon: Monitor },
]

export default function AppearanceSettingsPage() {
  const router = useRouter()
  const { theme, setTheme } = useTheme()
  const [accentColor, setAccentColor] = useState('#0891b2')
  const [saving, setSaving] = useState(false)
  const [success, setSuccess] = useState(false)
  const supabase = createClient()

  useEffect(() => {
    const fetchPreferences = async () => {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return

      const { data } = await supabase
        .from('profiles')
        .select('theme, accent_color')
        .eq('id', user.id)
        .single()

      if (data) {
        if (data.theme) setTheme(data.theme)
        if (data.accent_color) setAccentColor(data.accent_color)
      }
    }

    fetchPreferences()
  }, [supabase, setTheme])

  const handleSave = async () => {
    setSaving(true)
    setSuccess(false)

    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      setSaving(false)
      return
    }

    await supabase
      .from('profiles')
      .update({
        theme: theme as 'light' | 'dark' | 'system',
        accent_color: accentColor,
        updated_at: new Date().toISOString(),
      })
      .eq('id', user.id)

    setSuccess(true)
    setSaving(false)
    router.refresh()
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
          <CardTitle>Appearance</CardTitle>
          <CardDescription>
            Customize how Novaryn looks for you
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Theme Selection */}
          <Field>
            <FieldLabel>Theme</FieldLabel>
            <div className="grid grid-cols-3 gap-3">
              {themes.map((t) => (
                <button
                  key={t.value}
                  type="button"
                  onClick={() => setTheme(t.value)}
                  className={cn(
                    'flex flex-col items-center gap-2 rounded-lg border-2 p-4 transition-colors',
                    theme === t.value
                      ? 'border-primary bg-primary/5'
                      : 'border-border hover:border-primary/50'
                  )}
                >
                  <t.icon className="h-6 w-6" />
                  <span className="text-sm font-medium">{t.label}</span>
                </button>
              ))}
            </div>
          </Field>

          {/* Accent Color */}
          <Field>
            <FieldLabel>Accent Color</FieldLabel>
            <div className="grid grid-cols-4 gap-3 sm:grid-cols-8">
              {accentColors.map((color) => (
                <button
                  key={color.value}
                  type="button"
                  onClick={() => setAccentColor(color.value)}
                  className={cn(
                    'relative flex h-10 w-10 items-center justify-center rounded-full transition-transform hover:scale-110',
                    color.class
                  )}
                  title={color.name}
                >
                  {accentColor === color.value && (
                    <Check className="h-5 w-5 text-white" />
                  )}
                </button>
              ))}
            </div>
          </Field>

          {success && (
            <p className="text-sm text-green-600">Preferences saved successfully!</p>
          )}

          <div className="flex gap-3">
            <Button onClick={handleSave} disabled={saving}>
              {saving ? <Spinner className="mr-2 h-4 w-4" /> : null}
              Save Changes
            </Button>
            <Button variant="outline" asChild>
              <Link href="/settings">Cancel</Link>
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
