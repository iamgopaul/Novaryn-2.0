'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { FieldGroup, Field, FieldLabel, FieldError } from '@/components/ui/field'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Spinner } from '@/components/ui/spinner'
import { UserPlus } from 'lucide-react'

interface InviteMemberDialogProps {
  teamId: string
}

export function InviteMemberDialog({ teamId }: InviteMemberDialogProps) {
  const router = useRouter()
  const [isOpen, setIsOpen] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [email, setEmail] = useState('')
  const [role, setRole] = useState<'admin' | 'member'>('member')

  const handleInvite = async () => {
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

      // Generate invitation token
      const token = crypto.randomUUID()
      const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000) // 7 days

      const { error: inviteError } = await supabase
        .from('team_invitations')
        .insert({
          team_id: teamId,
          email: email.toLowerCase(),
          invited_by: user.id,
          role,
          token,
          expires_at: expiresAt.toISOString(),
        })

      if (inviteError) {
        if (inviteError.code === '23505') {
          setError('This email has already been invited')
        } else {
          setError(inviteError.message)
        }
        setLoading(false)
        return
      }

      // In production, send invitation email via Resend
      // For now, just close the dialog
      setEmail('')
      setRole('member')
      setIsOpen(false)
      router.refresh()
    } catch {
      setError('An unexpected error occurred')
    } finally {
      setLoading(false)
    }
  }

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        <Button>
          <UserPlus className="mr-2 h-4 w-4" />
          Invite Member
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Invite Team Member</DialogTitle>
        </DialogHeader>
        <FieldGroup>
          <Field>
            <FieldLabel>Email Address</FieldLabel>
            <Input
              type="email"
              placeholder="colleague@example.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
          </Field>
          <Field>
            <FieldLabel>Role</FieldLabel>
            <Select value={role} onValueChange={(v) => setRole(v as 'admin' | 'member')}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="member">Member</SelectItem>
                <SelectItem value="admin">Admin</SelectItem>
              </SelectContent>
            </Select>
          </Field>
          {error && <FieldError>{error}</FieldError>}
        </FieldGroup>
        <div className="flex justify-end gap-2">
          <Button variant="outline" onClick={() => setIsOpen(false)}>
            Cancel
          </Button>
          <Button onClick={handleInvite} disabled={loading || !email}>
            {loading ? <Spinner className="mr-2 h-4 w-4" /> : null}
            Send Invitation
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}
