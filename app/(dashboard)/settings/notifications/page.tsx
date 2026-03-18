'use client'

import { useState } from 'react'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Switch } from '@/components/ui/switch'
import { Spinner } from '@/components/ui/spinner'
import { ArrowLeft, Bell, Mail, MessageCircle, Users, FolderKanban } from 'lucide-react'

export default function NotificationsSettingsPage() {
  const [saving, setSaving] = useState(false)
  const [success, setSuccess] = useState(false)

  const [settings, setSettings] = useState({
    emailMessages: true,
    emailMentions: true,
    emailTeamUpdates: true,
    emailProjectUpdates: false,
    pushMessages: true,
    pushMentions: true,
  })

  const handleSave = async () => {
    setSaving(true)
    setSuccess(false)
    
    // Simulate save
    await new Promise(resolve => setTimeout(resolve, 500))
    
    setSuccess(true)
    setSaving(false)
  }

  const notifications = [
    {
      category: 'Messages',
      icon: MessageCircle,
      items: [
        {
          key: 'emailMessages',
          label: 'Email notifications for new messages',
          description: 'Receive an email when you get a new private message',
        },
      ],
    },
    {
      category: 'Community',
      icon: Users,
      items: [
        {
          key: 'emailMentions',
          label: 'Email notifications for mentions',
          description: 'Receive an email when someone mentions you in a post or comment',
        },
      ],
    },
    {
      category: 'Teams',
      icon: Users,
      items: [
        {
          key: 'emailTeamUpdates',
          label: 'Team activity updates',
          description: 'Receive emails about team invitations and important updates',
        },
      ],
    },
    {
      category: 'Projects',
      icon: FolderKanban,
      items: [
        {
          key: 'emailProjectUpdates',
          label: 'Project status updates',
          description: 'Receive weekly summaries of your project progress',
        },
      ],
    },
  ]

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
          <div className="flex items-center gap-2">
            <Bell className="h-5 w-5 text-primary" />
            <CardTitle>Notification Preferences</CardTitle>
          </div>
          <CardDescription>
            Choose what notifications you want to receive
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {notifications.map((section) => (
            <div key={section.category} className="space-y-4">
              <div className="flex items-center gap-2">
                <section.icon className="h-4 w-4 text-muted-foreground" />
                <h3 className="font-medium">{section.category}</h3>
              </div>
              {section.items.map((item) => (
                <div
                  key={item.key}
                  className="flex items-center justify-between rounded-lg border p-4"
                >
                  <div>
                    <p className="font-medium">{item.label}</p>
                    <p className="text-sm text-muted-foreground">{item.description}</p>
                  </div>
                  <Switch
                    checked={settings[item.key as keyof typeof settings]}
                    onCheckedChange={(checked) =>
                      setSettings({ ...settings, [item.key]: checked })
                    }
                  />
                </div>
              ))}
            </div>
          ))}

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
