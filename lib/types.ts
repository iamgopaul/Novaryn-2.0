// User & Profile Types
export interface Profile {
  id: string
  username: string | null
  display_name: string | null
  email: string | null
  avatar_url: string | null
  bio: string | null
  theme: 'light' | 'dark' | 'system'
  accent_color: string
  two_factor_enabled: boolean
  created_at: string
  updated_at: string
}

// Project Types
export interface Project {
  id: string
  user_id: string
  team_id: string | null
  name: string
  description: string | null
  status: 'planning' | 'design' | 'development' | 'testing' | 'review' | 'deployment' | 'completed' | 'archived'
  priority: 'low' | 'medium' | 'high' | 'critical'
  health: 'healthy' | 'at_risk' | 'critical'
  tech_stack: string[]
  settings: Record<string, unknown>
  start_date: string | null
  target_date: string | null
  created_at: string
  updated_at: string
}

// Service Types
export interface Service {
  id: string
  name: string
  type: 'api' | 'database' | 'cloud' | 'ai' | 'infrastructure'
  description: string | null
  icon: string | null
  config: Record<string, unknown>
  is_active: boolean
  created_at: string
}

// Tool Types
export interface Tool {
  id: string
  name: string
  type: 'editor' | 'terminal' | 'docs' | 'snippets'
  description: string | null
  icon: string | null
  config: Record<string, unknown>
  is_active: boolean
  created_at: string
}

export interface UserTool {
  id: string
  user_id: string
  tool_id: string
  settings: Record<string, unknown>
  is_favorite: boolean
  last_used_at: string | null
  created_at: string
  tool?: Tool
}

// Snippet Types
export interface Snippet {
  id: string
  user_id: string
  title: string
  description: string | null
  code: string
  language: string
  tags: string[]
  is_public: boolean
  created_at: string
  updated_at: string
}

// Team Types
export interface Team {
  id: string
  name: string
  description: string | null
  avatar_url: string | null
  owner_id: string
  settings: Record<string, unknown>
  created_at: string
  updated_at: string
}

export interface TeamMember {
  id: string
  team_id: string
  user_id: string
  role: 'owner' | 'admin' | 'member'
  joined_at: string
  profile?: Profile
}

export interface TeamInvitation {
  id: string
  team_id: string
  email: string
  invited_by: string
  role: 'admin' | 'member'
  status: 'pending' | 'accepted' | 'declined' | 'expired'
  token: string
  expires_at: string
  created_at: string
}

// Social Types
export interface Follower {
  id: string
  follower_id: string
  following_id: string
  created_at: string
  profile?: Profile
}

export interface Friendship {
  id: string
  user_id: string
  friend_id: string
  status: 'pending' | 'accepted' | 'declined' | 'blocked'
  created_at: string
  updated_at: string
  friend?: Profile
}

// Post Types
export interface Post {
  id: string
  user_id: string
  content: string
  media_urls: string[]
  repost_of: string | null
  is_pinned: boolean
  likes_count: number
  comments_count: number
  reposts_count: number
  created_at: string
  updated_at: string
  profile?: Profile
  original_post?: Post
  is_liked?: boolean
}

export interface PostComment {
  id: string
  post_id: string
  user_id: string
  parent_id: string | null
  content: string
  likes_count: number
  created_at: string
  updated_at: string
  profile?: Profile
  replies?: PostComment[]
}

// Private Message Types
export interface PrivateMessage {
  id: string
  sender_id: string
  receiver_id: string
  content: string
  is_read: boolean
  created_at: string
  sender?: Profile
  receiver?: Profile
}

export interface Conversation {
  user: Profile
  last_message: PrivateMessage
  unread_count: number
}

// AI Chat Types
export interface ChatConversation {
  id: string
  user_id: string
  title: string
  model: string
  created_at: string
  updated_at: string
}

export interface ChatMessage {
  id: string
  conversation_id: string
  role: 'user' | 'assistant' | 'system'
  content: string
  created_at: string
}

// Shared History Types
export interface SharedHistory {
  id: string
  team_id: string
  user_id: string
  action_type: string
  entity_type: string
  entity_id: string | null
  metadata: Record<string, unknown>
  created_at: string
  profile?: Profile
}
