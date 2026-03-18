import { useEffect, useState } from 'react'
import { Outlet, useNavigate, useLocation } from 'react-router-dom'
import { User } from '@supabase/supabase-js'
import { createClient } from '@/lib/supabase/client'
import { DashboardSidebar } from '@/components/dashboard/sidebar'
import { DashboardHeader } from '@/components/dashboard/header'
import { SidebarProvider, SidebarInset } from '@/components/ui/sidebar'
import { NovaChatBubble } from '@/components/chatbot/nova-chat-bubble'
import { Profile } from '@/lib/types'
import { logger } from '@/lib/logger'

export function DashboardLayout() {
  const navigate = useNavigate()
  const location = useLocation()
  const [user, setUser] = useState<User | null>(null)
  const [profile, setProfile] = useState<Profile | null>(null)
  const [loading, setLoading] = useState(true)
  const supabase = createClient()

  useEffect(() => {
    const init = async () => {
      try {
        const { data: { user: u } } = await supabase.auth.getUser()
        if (!u) {
          navigate('/auth/login', { replace: true })
          return
        }
        setUser(u)
        const { data: p } = await supabase.from('profiles').select('*').eq('id', u.id).single()
        setProfile(p ?? null)
      } catch (err) {
        logger.error('Dashboard layout init failed', 'DashboardLayout', err)
        navigate('/auth/login', { replace: true })
      } finally {
        setLoading(false)
      }
    }
    init()
  }, [navigate])

  if (loading || !user) {
    return (
      <div className="flex min-h-screen min-h-dvh items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-primary border-t-transparent" />
      </div>
    )
  }

  const isWorkspaceFull = location.pathname === '/workspace/full'

  if (isWorkspaceFull) {
    return (
      <div className="h-screen min-h-dvh w-screen overflow-hidden">
        <Outlet />
      </div>
    )
  }

  return (
    <SidebarProvider>
      <DashboardSidebar user={user} profile={profile} />
      <SidebarInset>
        <DashboardHeader user={user} profile={profile} />
        <main className="flex min-h-0 flex-1 flex-col overflow-auto p-4 sm:p-6">
          <Outlet />
        </main>
      </SidebarInset>
      {location.pathname !== '/chatbot' && <NovaChatBubble userId={user.id} />}
    </SidebarProvider>
  )
}
