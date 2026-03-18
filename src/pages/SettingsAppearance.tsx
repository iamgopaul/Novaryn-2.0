import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { ThemeSettings } from '@/components/settings/theme-settings'
import { Profile } from '@/lib/types'

export function SettingsAppearance() {
  const [profile, setProfile] = useState<Profile | null>(null)
  const [loading, setLoading] = useState(true)
  const supabase = createClient()

  useEffect(() => {
    const load = async () => {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) { setLoading(false); return }
      const { data } = await supabase.from('profiles').select('*').eq('id', user.id).single()
      setProfile(data as Profile | null)
      setLoading(false)
    }
    load()
  }, [])

  if (loading) return <div className="flex justify-center py-12"><div className="h-8 w-8 animate-spin rounded-full border-2 border-primary border-t-transparent" /></div>
  return <ThemeSettings profile={profile} />
}
