import { Routes, Route, Navigate } from 'react-router-dom'
import { DashboardLayout } from '@/layouts/DashboardLayout'
import { Home } from '@/pages/Home'
import { About } from '@/pages/About'
import { Login } from '@/pages/Login'
import { SignUp } from '@/pages/SignUp'
import { SignUpSuccess } from '@/pages/SignUpSuccess'
import { AuthCallback } from '@/pages/AuthCallback'
import { Dashboard } from '@/pages/Dashboard'
import { Projects } from '@/pages/Projects'
import { NewProject } from '@/pages/NewProject'
import { Tools } from '@/pages/Tools'
import { EditorPage } from '@/pages/EditorPage'
import { TerminalPage } from '@/pages/TerminalPage'
import { DocsPage } from '@/pages/DocsPage'
import { SnippetsPage } from '@/pages/SnippetsPage'
import { Teams } from '@/pages/Teams'
import { NewTeam } from '@/pages/NewTeam'
import { TeamDetail } from '@/pages/TeamDetail'
import { Community } from '@/pages/Community'
import { ChatbotPage } from '@/pages/ChatbotPage'
import { MessagesList } from '@/pages/MessagesList'
import { Conversation } from '@/pages/Conversation'
import { Settings } from '@/pages/Settings'
import { SettingsProfile } from '@/pages/SettingsProfile'
import { SettingsSecurity } from '@/pages/SettingsSecurity'
import { SettingsNotifications } from '@/pages/SettingsNotifications'
import { SettingsAppearance } from '@/pages/SettingsAppearance'
import { Placeholder } from '@/pages/Placeholder'

export default function App() {
  return (
    <Routes>
      <Route path="/" element={<Home />} />
      <Route path="/about" element={<About />} />
      <Route path="/auth/login" element={<Login />} />
      <Route path="/auth/sign-up" element={<SignUp />} />
      <Route path="/auth/sign-up-success" element={<SignUpSuccess />} />
      <Route path="/auth/callback" element={<AuthCallback />} />
      <Route path="/auth/error" element={<Placeholder />} />

      <Route element={<DashboardLayout />}>
        <Route path="dashboard" element={<Dashboard />} />
        <Route path="projects" element={<Projects />} />
        <Route path="projects/new" element={<NewProject />} />
        <Route path="tools" element={<Tools />} />
        <Route path="tools/editor" element={<EditorPage />} />
        <Route path="tools/terminal" element={<TerminalPage />} />
        <Route path="tools/docs" element={<DocsPage />} />
        <Route path="tools/snippets" element={<SnippetsPage />} />
        <Route path="teams" element={<Teams />} />
        <Route path="teams/new" element={<NewTeam />} />
        <Route path="teams/:id" element={<TeamDetail />} />
        <Route path="community" element={<Community />} />
        <Route path="chatbot" element={<ChatbotPage />} />
        <Route path="messages" element={<MessagesList />} />
        <Route path="messages/:userId" element={<Conversation />} />
        <Route path="settings" element={<Settings />} />
        <Route path="settings/profile" element={<SettingsProfile />} />
        <Route path="settings/security" element={<SettingsSecurity />} />
        <Route path="settings/notifications" element={<SettingsNotifications />} />
        <Route path="settings/appearance" element={<SettingsAppearance />} />
      </Route>

      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  )
}
