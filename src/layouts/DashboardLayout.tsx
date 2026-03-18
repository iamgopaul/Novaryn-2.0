import { useEffect, useState } from 'react'
import { Outlet, useNavigate, useLocation } from 'react-router-dom'
import { User } from '@supabase/supabase-js'
import { createClient } from '@/lib/supabase/client'
import { DashboardSidebar } from '@/components/dashboard/sidebar'
import { DashboardHeader } from '@/components/dashboard/header'
import { SidebarProvider, SidebarInset } from '@/components/ui/sidebar'
import { NovaChatBubble } from '@/components/chatbot/nova-chat-bubble'
import { Profile } from '@/lib/types'

export function DashboardLayout() {
  const navigate = useNavigate()
  const location = useLocation()
  const [user, setUser] = useState<User | null>(null)
  const [profile, setProfile] = useState<Profile | null>(null)
  const [loading, setLoading] = useState(true)
  const supabase = createClient()

  useEffect(() => {
    const init = async () => {
      const { data: { user: u } } = await supabase.auth.getUser()
      if (!u) {
        navigate('/auth/login', { replace: true })
        return
      }
      setUser(u)
      const { data: p } = await supabase.from('profiles').select('*').eq('id', u.id).single()
      setProfile(p ?? null)
      setLoading(false)
    }
    init()
  }, [navigate])

  if (loading || !user) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-primary border-t-transparent" />
      </div>
    )
  }

  return (
    <SidebarProvider>
      <DashboardSidebar user={user} profile={profile} />
      <SidebarInset>
        <DashboardHeader user={user} profile={profile} />
        <main className="flex-1 overflow-auto p-4 sm:p-6">
          <Outlet />
        </main>
      </SidebarInset>
      {location.pathname !== '/chatbot' && <NovaChatBubble userId={user.id} />}
    </SidebarProvider>
  )
}
