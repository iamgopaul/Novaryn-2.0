import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { User } from '@supabase/supabase-js'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { Separator } from '@/components/ui/separator'
import { Spinner } from '@/components/ui/spinner'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog'
import { toast } from 'sonner'
import { LogOut, Trash2, Download } from 'lucide-react'

interface AccountSettingsProps {
  user: User
}

export function AccountSettings({ user }: AccountSettingsProps) {
  const [signOutLoading, setSignOutLoading] = useState(false)
  const [deleteLoading, setDeleteLoading] = useState(false)
  const [exportLoading, setExportLoading] = useState(false)
  const navigate = useNavigate()

  const handleSignOut = async () => {
    setSignOutLoading(true)
    try {
      const supabase = createClient()
      await supabase.auth.signOut()
      navigate('/')
    } catch (error) {
      console.error('Error signing out:', error)
      toast.error('Failed to sign out')
    } finally {
      setSignOutLoading(false)
    }
  }

  const handleExportData = async () => {
    setExportLoading(true)
    try {
      const supabase = createClient()
      
      // Fetch all user data
      const [profile, projects, snippets, posts] = await Promise.all([
        supabase.from('profiles').select('*').eq('id', user.id).single(),
        supabase.from('projects').select('*').eq('user_id', user.id),
        supabase.from('snippets').select('*').eq('user_id', user.id),
        supabase.from('posts').select('*').eq('user_id', user.id),
      ])

      const exportData = {
        exportedAt: new Date().toISOString(),
        profile: profile.data,
        projects: projects.data,
        snippets: snippets.data,
        posts: posts.data,
      }

      // Create and download JSON file
      const blob = new Blob([JSON.stringify(exportData, null, 2)], { type: 'application/json' })
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `novaryn-export-${new Date().toISOString().split('T')[0]}.json`
      document.body.appendChild(a)
      a.click()
      document.body.removeChild(a)
      URL.revokeObjectURL(url)

      toast.success('Data exported successfully')
    } catch (error) {
      console.error('Error exporting data:', error)
      toast.error('Failed to export data')
    } finally {
      setExportLoading(false)
    }
  }

  const handleDeleteAccount = async () => {
    setDeleteLoading(true)
    try {
      const supabase = createClient()
      
      // Delete user data (cascade should handle related records)
      await supabase.from('profiles').delete().eq('id', user.id)
      
      // Sign out
      await supabase.auth.signOut()
      
      toast.success('Account deleted')
      navigate('/')
    } catch (error) {
      console.error('Error deleting account:', error)
      toast.error('Failed to delete account')
    } finally {
      setDeleteLoading(false)
    }
  }

  return (
    <div className="space-y-8">
      {/* Export Data */}
      <div>
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10">
            <Download className="h-5 w-5 text-primary" />
          </div>
          <div className="flex-1">
            <h3 className="font-medium">Export Your Data</h3>
            <p className="text-sm text-muted-foreground">
              Download a copy of all your data including projects, snippets, and posts
            </p>
          </div>
          <Button variant="outline" onClick={handleExportData} disabled={exportLoading}>
            {exportLoading ? <Spinner className="mr-2 h-4 w-4" /> : <Download className="mr-2 h-4 w-4" />}
            Export
          </Button>
        </div>
      </div>

      <Separator />

      {/* Sign Out */}
      <div>
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-orange-500/10">
            <LogOut className="h-5 w-5 text-orange-500" />
          </div>
          <div className="flex-1">
            <h3 className="font-medium">Sign Out</h3>
            <p className="text-sm text-muted-foreground">
              Sign out of your account on this device
            </p>
          </div>
          <Button variant="outline" onClick={handleSignOut} disabled={signOutLoading}>
            {signOutLoading ? <Spinner className="mr-2 h-4 w-4" /> : <LogOut className="mr-2 h-4 w-4" />}
            Sign Out
          </Button>
        </div>
      </div>

      <Separator />

      {/* Delete Account */}
      <div>
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-destructive/10">
            <Trash2 className="h-5 w-5 text-destructive" />
          </div>
          <div className="flex-1">
            <h3 className="font-medium text-destructive">Delete Account</h3>
            <p className="text-sm text-muted-foreground">
              Permanently delete your account and all associated data
            </p>
          </div>
          <AlertDialog>
            <AlertDialogTrigger asChild>
              <Button variant="destructive">
                <Trash2 className="mr-2 h-4 w-4" />
                Delete Account
              </Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
                <AlertDialogDescription>
                  This action cannot be undone. This will permanently delete your account
                  and remove all your data from our servers, including:
                  <ul className="mt-2 list-inside list-disc space-y-1">
                    <li>Your profile and settings</li>
                    <li>All your projects and code</li>
                    <li>Your snippets and documentation</li>
                    <li>All posts and comments</li>
                    <li>Team memberships</li>
                  </ul>
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>Cancel</AlertDialogCancel>
                <AlertDialogAction
                  onClick={handleDeleteAccount}
                  className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                  disabled={deleteLoading}
                >
                  {deleteLoading ? <Spinner className="mr-2 h-4 w-4" /> : null}
                  Yes, delete my account
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </div>
      </div>
    </div>
  )
}
