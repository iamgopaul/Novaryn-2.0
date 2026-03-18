import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useTheme } from 'next-themes'
import { createClient } from '@/lib/supabase/client'
import { Profile } from '@/lib/types'
import { Button } from '@/components/ui/button'
import { FieldGroup, Field, FieldLabel } from '@/components/ui/field'
import { Spinner } from '@/components/ui/spinner'
import { toast } from 'sonner'
import { Sun, Moon, Monitor, Check } from 'lucide-react'
import { cn } from '@/lib/utils'
import { logger } from '@/lib/logger'

interface ThemeSettingsProps {
  profile: Profile | null
}

const themes = [
  { value: 'light', label: 'Light', icon: Sun },
  { value: 'dark', label: 'Dark', icon: Moon },
  { value: 'system', label: 'System', icon: Monitor },
]

const accentColors = [
  { value: '#3b82f6', label: 'Blue' },
  { value: '#8b5cf6', label: 'Violet' },
  { value: '#22c55e', label: 'Green' },
  { value: '#f59e0b', label: 'Amber' },
  { value: '#ef4444', label: 'Red' },
  { value: '#ec4899', label: 'Pink' },
  { value: '#06b6d4', label: 'Cyan' },
  { value: '#f97316', label: 'Orange' },
]

export function ThemeSettings({ profile }: ThemeSettingsProps) {
  const [loading, setLoading] = useState(false)
  const [accentColor, setAccentColor] = useState(profile?.accent_color || '#3b82f6')
  const { theme, setTheme } = useTheme()
  const navigate = useNavigate()

  const handleSave = async () => {
    setLoading(true)
    try {
      const supabase = createClient()
      const { data: { user } } = await supabase.auth.getUser()

      if (!user) return

      const { error } = await supabase
        .from('profiles')
        .update({
          theme: theme as 'light' | 'dark' | 'system',
          accent_color: accentColor,
          updated_at: new Date().toISOString(),
        })
        .eq('id', user.id)

      if (error) throw error

      toast.success('Appearance settings saved')
    } catch (error) {
      logger.error('Error saving theme settings', 'ThemeSettings', error)
      toast.error('Failed to save settings')
    } finally {
      setLoading(false)
    }
  }

  return (
    <FieldGroup>
      {/* Theme Selection */}
      <Field>
        <FieldLabel>Theme</FieldLabel>
        <div className="grid grid-cols-3 gap-3">
          {themes.map(({ value, label, icon: Icon }) => (
            <button
              key={value}
              type="button"
              onClick={() => setTheme(value)}
              className={cn(
                'flex flex-col items-center gap-2 rounded-lg border-2 p-4 transition-colors',
                theme === value
                  ? 'border-primary bg-primary/5'
                  : 'border-transparent bg-muted hover:bg-muted/80'
              )}
            >
              <Icon className={cn('h-6 w-6', theme === value && 'text-primary')} />
              <span className={cn('text-sm font-medium', theme === value && 'text-primary')}>
                {label}
              </span>
            </button>
          ))}
        </div>
      </Field>

      {/* Accent Color */}
      <Field>
        <FieldLabel>Accent Color</FieldLabel>
        <div className="flex flex-wrap gap-3">
          {accentColors.map((color) => (
            <button
              key={color.value}
              type="button"
              onClick={() => setAccentColor(color.value)}
              className={cn(
                'relative flex h-10 w-10 items-center justify-center rounded-full transition-transform hover:scale-110',
                accentColor === color.value && 'ring-2 ring-offset-2 ring-offset-background'
              )}
              style={{ 
                backgroundColor: color.value,
              }}
              title={color.label}
            >
              {accentColor === color.value && (
                <Check className="h-5 w-5 text-white" />
              )}
            </button>
          ))}
        </div>
        <p className="text-xs text-muted-foreground">
          Choose your preferred accent color for buttons and highlights
        </p>
      </Field>

      {/* Preview */}
      <Field>
        <FieldLabel>Preview</FieldLabel>
        <div className="rounded-lg border p-4">
          <div className="flex items-center gap-3">
            <Button style={{ backgroundColor: accentColor }}>
              Primary Button
            </Button>
            <Button variant="outline">Outline Button</Button>
            <Button variant="ghost">Ghost Button</Button>
          </div>
        </div>
      </Field>

      <Button onClick={handleSave} disabled={loading}>
        {loading ? <Spinner className="mr-2 h-4 w-4" /> : null}
        Save Appearance
      </Button>
    </FieldGroup>
  )
}
