import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { User } from '@supabase/supabase-js'
import { createClient } from '@/lib/supabase/client'
import { Profile } from '@/lib/types'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Switch } from '@/components/ui/switch'
import { FieldGroup, Field, FieldLabel } from '@/components/ui/field'
import { Spinner } from '@/components/ui/spinner'
import { Badge } from '@/components/ui/badge'
import { Separator } from '@/components/ui/separator'
import { toast } from 'sonner'
import { Shield, Key, Smartphone } from 'lucide-react'

interface SecuritySettingsProps {
  user: User
  profile: Profile | null
}

export function SecuritySettings({ user, profile }: SecuritySettingsProps) {
  const [loading, setLoading] = useState(false)
  const [passwordLoading, setPasswordLoading] = useState(false)
  const [twoFactorEnabled, setTwoFactorEnabled] = useState(profile?.two_factor_enabled || false)
  const [currentPassword, setCurrentPassword] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const navigate = useNavigate()

  const handleToggle2FA = async () => {
    setLoading(true)
    try {
      const supabase = createClient()
      
      const newValue = !twoFactorEnabled
      const { error } = await supabase
        .from('profiles')
        .update({ two_factor_enabled: newValue })
        .eq('id', user.id)

      if (error) throw error

      setTwoFactorEnabled(newValue)
      toast.success(newValue ? '2FA enabled' : '2FA disabled')
    } catch (error) {
      console.error('Error toggling 2FA:', error)
      toast.error('Failed to update 2FA settings')
    } finally {
      setLoading(false)
    }
  }

  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (newPassword !== confirmPassword) {
      toast.error('Passwords do not match')
      return
    }

    if (newPassword.length < 8) {
      toast.error('Password must be at least 8 characters')
      return
    }

    setPasswordLoading(true)
    try {
      const supabase = createClient()
      
      const { error } = await supabase.auth.updateUser({
        password: newPassword,
      })

      if (error) throw error

      setCurrentPassword('')
      setNewPassword('')
      setConfirmPassword('')
      toast.success('Password updated successfully')
    } catch (error) {
      console.error('Error changing password:', error)
      toast.error('Failed to change password')
    } finally {
      setPasswordLoading(false)
    }
  }

  return (
    <div className="space-y-8">
      {/* Two-Factor Authentication */}
      <div>
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10">
            <Smartphone className="h-5 w-5 text-primary" />
          </div>
          <div className="flex-1">
            <h3 className="font-medium">Two-Factor Authentication</h3>
            <p className="text-sm text-muted-foreground">
              Add an extra layer of security to your account
            </p>
          </div>
          <div className="flex items-center gap-3">
            {twoFactorEnabled && (
              <Badge variant="secondary" className="bg-green-500/10 text-green-600">
                Enabled
              </Badge>
            )}
            <Switch
              checked={twoFactorEnabled}
              onCheckedChange={handleToggle2FA}
              disabled={loading}
            />
          </div>
        </div>
        {twoFactorEnabled && (
          <p className="mt-3 text-sm text-muted-foreground">
            A 6-digit code will be sent to your email when you sign in from a new device.
          </p>
        )}
      </div>

      <Separator />

      {/* Change Password */}
      <div>
        <div className="mb-4 flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10">
            <Key className="h-5 w-5 text-primary" />
          </div>
          <div>
            <h3 className="font-medium">Change Password</h3>
            <p className="text-sm text-muted-foreground">
              Update your password regularly to keep your account secure
            </p>
          </div>
        </div>

        <form onSubmit={handleChangePassword}>
          <FieldGroup>
            <Field>
              <FieldLabel htmlFor="newPassword">New Password</FieldLabel>
              <Input
                id="newPassword"
                type="password"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                placeholder="Enter new password"
              />
            </Field>
            <Field>
              <FieldLabel htmlFor="confirmPassword">Confirm Password</FieldLabel>
              <Input
                id="confirmPassword"
                type="password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder="Confirm new password"
              />
            </Field>
            <Button type="submit" disabled={passwordLoading || !newPassword || !confirmPassword}>
              {passwordLoading ? <Spinner className="mr-2 h-4 w-4" /> : null}
              Update Password
            </Button>
          </FieldGroup>
        </form>
      </div>

      <Separator />

      {/* Active Sessions */}
      <div>
        <div className="mb-4 flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10">
            <Shield className="h-5 w-5 text-primary" />
          </div>
          <div>
            <h3 className="font-medium">Active Sessions</h3>
            <p className="text-sm text-muted-foreground">
              Manage your active sessions across devices
            </p>
          </div>
        </div>
        <div className="rounded-lg border p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="font-medium">Current Session</p>
              <p className="text-sm text-muted-foreground">
                Last active: Now
              </p>
            </div>
            <Badge>Active</Badge>
          </div>
        </div>
      </div>
    </div>
  )
}
