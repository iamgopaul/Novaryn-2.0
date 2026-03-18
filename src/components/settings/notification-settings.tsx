'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Switch } from '@/components/ui/switch'
import { FieldGroup, Field, FieldLabel } from '@/components/ui/field'
import { Spinner } from '@/components/ui/spinner'
import { Separator } from '@/components/ui/separator'
import { toast } from 'sonner'
import { Mail, MessageSquare, Users, Bell, Zap } from 'lucide-react'

const notificationOptions = [
  {
    id: 'project_updates',
    icon: Zap,
    title: 'Project Updates',
    description: 'Get notified when there are updates to your projects',
  },
  {
    id: 'team_activity',
    icon: Users,
    title: 'Team Activity',
    description: 'Notifications about team member actions and invites',
  },
  {
    id: 'messages',
    icon: MessageSquare,
    title: 'Direct Messages',
    description: 'Get notified when you receive a new message',
  },
  {
    id: 'community',
    icon: Bell,
    title: 'Community',
    description: 'Likes, comments, and new followers',
  },
  {
    id: 'marketing',
    icon: Mail,
    title: 'Product Updates',
    description: 'News about new features and improvements',
  },
]

export function NotificationSettings() {
  const [loading, setLoading] = useState(false)
  const [settings, setSettings] = useState<Record<string, boolean>>({
    project_updates: true,
    team_activity: true,
    messages: true,
    community: true,
    marketing: false,
  })

  const handleToggle = (id: string) => {
    setSettings(prev => ({ ...prev, [id]: !prev[id] }))
  }

  const handleSave = async () => {
    setLoading(true)
    try {
      // In a real app, save to database
      await new Promise(resolve => setTimeout(resolve, 500))
      toast.success('Notification preferences saved')
    } catch (error) {
      toast.error('Failed to save preferences')
    } finally {
      setLoading(false)
    }
  }

  return (
    <FieldGroup>
      <div className="space-y-4">
        {notificationOptions.map((option, index) => (
          <div key={option.id}>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-muted">
                  <option.icon className="h-5 w-5 text-muted-foreground" />
                </div>
                <div>
                  <p className="font-medium">{option.title}</p>
                  <p className="text-sm text-muted-foreground">{option.description}</p>
                </div>
              </div>
              <Switch
                checked={settings[option.id]}
                onCheckedChange={() => handleToggle(option.id)}
              />
            </div>
            {index < notificationOptions.length - 1 && (
              <Separator className="mt-4" />
            )}
          </div>
        ))}
      </div>

      <Button onClick={handleSave} disabled={loading} className="mt-6">
        {loading ? <Spinner className="mr-2 h-4 w-4" /> : null}
        Save Preferences
      </Button>
    </FieldGroup>
  )
}
