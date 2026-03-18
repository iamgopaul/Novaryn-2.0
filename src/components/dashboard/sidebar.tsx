import { Link, useLocation } from 'react-router-dom'
import { User } from '@supabase/supabase-js'
import { Profile } from '@/lib/types'
import { NovarynLogo } from '@/components/novaryn-logo'
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
} from '@/components/ui/sidebar'
import {
  LayoutDashboard,
  FolderKanban,
  Wrench,
  Users,
  MessageCircle,
  Mail,
  Bot,
  Settings,
  Layers,
  Code2,
  Terminal,
  FileText,
  Bookmark,
} from 'lucide-react'

interface DashboardSidebarProps {
  user: User
  profile: Profile | null
}

const mainNavItems = [
  { href: '/dashboard', icon: LayoutDashboard, label: 'Overview' },
  { href: '/projects', icon: FolderKanban, label: 'Projects' },
  { href: '/tools', icon: Wrench, label: 'Tools' },
  { href: '/teams', icon: Users, label: 'Teams' },
]

const toolItems = [
  { href: '/tools/editor', icon: Code2, label: 'Code Editor' },
  { href: '/tools/terminal', icon: Terminal, label: 'Terminal' },
  { href: '/tools/docs', icon: FileText, label: 'Docs Generator' },
  { href: '/tools/snippets', icon: Bookmark, label: 'Snippets' },
]

const socialItems = [
  { href: '/community', icon: MessageCircle, label: 'Community' },
  { href: '/messages', icon: Mail, label: 'Messages' },
  { href: '/chatbot', icon: Bot, label: 'Nova' },
]

export function DashboardSidebar({ profile }: DashboardSidebarProps) {
  const pathname = useLocation().pathname

  return (
    <Sidebar>
      <SidebarHeader>
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton size="lg" asChild>
              <Link to="/dashboard">
                <div className="flex h-8 w-8 items-center justify-center">
                  <NovarynLogo className="h-8 w-8" />
                </div>
                <div className="flex flex-col gap-0.5 leading-none">
                  <span className="font-semibold">Novaryn</span>
                  <span className="text-xs text-muted-foreground">Developer Hub</span>
                </div>
              </Link>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarHeader>

      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupLabel>Main</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {mainNavItems.map((item) => (
                <SidebarMenuItem key={item.href}>
                  <SidebarMenuButton asChild isActive={pathname === item.href}>
                    <Link to={item.href}>
                      <item.icon className="h-4 w-4" />
                      <span>{item.label}</span>
                    </Link>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        <SidebarGroup>
          <SidebarGroupLabel>Tools</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {toolItems.map((item) => (
                <SidebarMenuItem key={item.href}>
                  <SidebarMenuButton asChild isActive={pathname === item.href}>
                    <Link to={item.href}>
                      <item.icon className="h-4 w-4" />
                      <span>{item.label}</span>
                    </Link>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        <SidebarGroup>
          <SidebarGroupLabel>Social</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {socialItems.map((item) => (
                <SidebarMenuItem key={item.href}>
                  <SidebarMenuButton asChild isActive={pathname === item.href}>
                    <Link to={item.href}>
                      <item.icon className="h-4 w-4" />
                      <span>{item.label}</span>
                    </Link>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>

      <SidebarFooter>
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton asChild isActive={pathname.startsWith('/settings')}>
              <Link to="/settings">
                <Settings className="h-4 w-4" />
                <span>Settings</span>
              </Link>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarFooter>
    </Sidebar>
  )
}
