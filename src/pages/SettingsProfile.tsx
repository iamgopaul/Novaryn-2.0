import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { ProfileSettings } from '@/components/settings/profile-settings'
import { User } from '@supabase/supabase-js'
import { Profile } from '@/lib/types'

export function SettingsProfile() {
  const [user, setUser] = useState<User | null>(null)
  const [profile, setProfile] = useState<Profile | null>(null)
  const [loading, setLoading] = useState(true)
  const supabase = createClient()

  useEffect(() => {
    const load = async () => {
      const { data: { user: u } } = await supabase.auth.getUser()
      if (!u) { setLoading(false); return }
      setUser(u)
      const { data: p } = await supabase.from('profiles').select('*').eq('id', u.id).single()
      setProfile(p as Profile | null)
      setLoading(false)
    }
    load()
  }, [])

  if (loading) return <div className="flex justify-center py-12"><div className="h-8 w-8 animate-spin rounded-full border-2 border-primary border-t-transparent" /></div>
  if (!user) return null
  return <ProfileSettings user={user} profile={profile} />
}
