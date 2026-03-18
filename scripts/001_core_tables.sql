-- Novaryn Developer Hub - Core Tables
-- Part 1: Basic tables without circular dependencies

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ============================================
-- PROFILES TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  username TEXT UNIQUE,
  display_name TEXT,
  email TEXT,
  avatar_url TEXT,
  bio TEXT,
  theme TEXT DEFAULT 'system' CHECK (theme IN ('light', 'dark', 'system')),
  accent_color TEXT DEFAULT 'violet',
  two_factor_enabled BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "profiles_select_all" ON public.profiles FOR SELECT USING (true);
CREATE POLICY "profiles_insert_own" ON public.profiles FOR INSERT WITH CHECK (auth.uid() = id);
CREATE POLICY "profiles_update_own" ON public.profiles FOR UPDATE USING (auth.uid() = id);
CREATE POLICY "profiles_delete_own" ON public.profiles FOR DELETE USING (auth.uid() = id);

-- ============================================
-- TWO FACTOR CODES TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS public.two_factor_codes (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  code TEXT NOT NULL,
  expires_at TIMESTAMPTZ NOT NULL,
  used BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.two_factor_codes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "two_factor_codes_select_own" ON public.two_factor_codes FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "two_factor_codes_insert_service" ON public.two_factor_codes FOR INSERT WITH CHECK (true);
CREATE POLICY "two_factor_codes_update_service" ON public.two_factor_codes FOR UPDATE USING (true);

-- ============================================
-- PROJECTS TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS public.projects (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  team_id UUID,
  name TEXT NOT NULL,
  description TEXT,
  status TEXT DEFAULT 'active' CHECK (status IN ('active', 'archived', 'paused')),
  sdlc_phase TEXT DEFAULT 'planning' CHECK (sdlc_phase IN ('planning', 'design', 'development', 'testing', 'deployment', 'maintenance')),
  repository_url TEXT,
  tech_stack TEXT[],
  priority TEXT DEFAULT 'medium' CHECK (priority IN ('low', 'medium', 'high', 'critical')),
  due_date TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.projects ENABLE ROW LEVEL SECURITY;

CREATE POLICY "projects_select_own" ON public.projects FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "projects_insert_own" ON public.projects FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "projects_update_own" ON public.projects FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "projects_delete_own" ON public.projects FOR DELETE USING (auth.uid() = user_id);

-- ============================================
-- SERVICES TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS public.services (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  project_id UUID NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  type TEXT NOT NULL CHECK (type IN ('api', 'database', 'ai', 'infrastructure', 'monitoring', 'storage')),
  description TEXT,
  config JSONB DEFAULT '{}',
  status TEXT DEFAULT 'active' CHECK (status IN ('active', 'inactive', 'error', 'pending')),
  endpoint_url TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.services ENABLE ROW LEVEL SECURITY;

CREATE POLICY "services_select_own" ON public.services FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "services_insert_own" ON public.services FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "services_update_own" ON public.services FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "services_delete_own" ON public.services FOR DELETE USING (auth.uid() = user_id);

-- ============================================
-- TOOLS TABLE (system-wide)
-- ============================================
CREATE TABLE IF NOT EXISTS public.tools (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL UNIQUE,
  type TEXT NOT NULL CHECK (type IN ('editor', 'terminal', 'docs', 'snippets')),
  description TEXT,
  icon TEXT,
  config JSONB DEFAULT '{}',
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.tools ENABLE ROW LEVEL SECURITY;

CREATE POLICY "tools_select_all" ON public.tools FOR SELECT USING (true);

-- ============================================
-- USER TOOLS (preferences)
-- ============================================
CREATE TABLE IF NOT EXISTS public.user_tools (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  tool_id UUID NOT NULL REFERENCES public.tools(id) ON DELETE CASCADE,
  settings JSONB DEFAULT '{}',
  is_favorite BOOLEAN DEFAULT FALSE,
  last_used_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, tool_id)
);

ALTER TABLE public.user_tools ENABLE ROW LEVEL SECURITY;

CREATE POLICY "user_tools_select_own" ON public.user_tools FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "user_tools_insert_own" ON public.user_tools FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "user_tools_update_own" ON public.user_tools FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "user_tools_delete_own" ON public.user_tools FOR DELETE USING (auth.uid() = user_id);

-- ============================================
-- SNIPPETS TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS public.snippets (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT,
  language TEXT NOT NULL,
  code TEXT NOT NULL,
  tags TEXT[],
  is_public BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.snippets ENABLE ROW LEVEL SECURITY;

CREATE POLICY "snippets_select_own" ON public.snippets FOR SELECT USING (auth.uid() = user_id OR is_public = true);
CREATE POLICY "snippets_insert_own" ON public.snippets FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "snippets_update_own" ON public.snippets FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "snippets_delete_own" ON public.snippets FOR DELETE USING (auth.uid() = user_id);

-- ============================================
-- FOLLOWERS TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS public.followers (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  follower_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  following_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(follower_id, following_id),
  CHECK (follower_id != following_id)
);

ALTER TABLE public.followers ENABLE ROW LEVEL SECURITY;

CREATE POLICY "followers_select_all" ON public.followers FOR SELECT USING (true);
CREATE POLICY "followers_insert_own" ON public.followers FOR INSERT WITH CHECK (auth.uid() = follower_id);
CREATE POLICY "followers_delete_own" ON public.followers FOR DELETE USING (auth.uid() = follower_id);

-- ============================================
-- FRIENDSHIPS TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS public.friendships (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  friend_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'accepted', 'blocked')),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, friend_id),
  CHECK (user_id != friend_id)
);

ALTER TABLE public.friendships ENABLE ROW LEVEL SECURITY;

CREATE POLICY "friendships_select_own" ON public.friendships FOR SELECT USING (
  auth.uid() = user_id OR auth.uid() = friend_id
);
CREATE POLICY "friendships_insert_own" ON public.friendships FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "friendships_update_own" ON public.friendships FOR UPDATE USING (
  auth.uid() = user_id OR auth.uid() = friend_id
);
CREATE POLICY "friendships_delete_own" ON public.friendships FOR DELETE USING (
  auth.uid() = user_id OR auth.uid() = friend_id
);
