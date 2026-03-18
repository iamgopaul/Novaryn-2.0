-- Novaryn Developer Hub - Teams Tables
-- Part 2: Team-related tables

-- ============================================
-- TEAMS TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS public.teams (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL,
  description TEXT,
  owner_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  avatar_url TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.teams ENABLE ROW LEVEL SECURITY;

-- ============================================
-- TEAM MEMBERS TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS public.team_members (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  team_id UUID NOT NULL REFERENCES public.teams(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role TEXT DEFAULT 'member' CHECK (role IN ('owner', 'admin', 'member')),
  joined_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(team_id, user_id)
);

ALTER TABLE public.team_members ENABLE ROW LEVEL SECURITY;

-- Teams RLS policies (after team_members exists)
CREATE POLICY "teams_select_member" ON public.teams FOR SELECT USING (
  EXISTS (
    SELECT 1 FROM public.team_members 
    WHERE team_members.team_id = teams.id 
    AND team_members.user_id = auth.uid()
  ) OR owner_id = auth.uid()
);
CREATE POLICY "teams_insert_own" ON public.teams FOR INSERT WITH CHECK (auth.uid() = owner_id);
CREATE POLICY "teams_update_owner" ON public.teams FOR UPDATE USING (auth.uid() = owner_id);
CREATE POLICY "teams_delete_owner" ON public.teams FOR DELETE USING (auth.uid() = owner_id);

-- Team members RLS policies
CREATE POLICY "team_members_select" ON public.team_members FOR SELECT USING (
  EXISTS (
    SELECT 1 FROM public.team_members tm 
    WHERE tm.team_id = team_members.team_id 
    AND tm.user_id = auth.uid()
  )
);
CREATE POLICY "team_members_insert_admin" ON public.team_members FOR INSERT WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.team_members tm 
    WHERE tm.team_id = team_members.team_id 
    AND tm.user_id = auth.uid() 
    AND tm.role IN ('owner', 'admin')
  ) OR EXISTS (
    SELECT 1 FROM public.teams t 
    WHERE t.id = team_members.team_id 
    AND t.owner_id = auth.uid()
  )
);
CREATE POLICY "team_members_update_admin" ON public.team_members FOR UPDATE USING (
  EXISTS (
    SELECT 1 FROM public.team_members tm 
    WHERE tm.team_id = team_members.team_id 
    AND tm.user_id = auth.uid() 
    AND tm.role IN ('owner', 'admin')
  )
);
CREATE POLICY "team_members_delete_admin" ON public.team_members FOR DELETE USING (
  EXISTS (
    SELECT 1 FROM public.team_members tm 
    WHERE tm.team_id = team_members.team_id 
    AND tm.user_id = auth.uid() 
    AND tm.role IN ('owner', 'admin')
  ) OR auth.uid() = user_id
);

-- ============================================
-- TEAM INVITATIONS TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS public.team_invitations (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  team_id UUID NOT NULL REFERENCES public.teams(id) ON DELETE CASCADE,
  email TEXT NOT NULL,
  invited_by UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'accepted', 'declined', 'expired')),
  token TEXT NOT NULL UNIQUE,
  expires_at TIMESTAMPTZ NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.team_invitations ENABLE ROW LEVEL SECURITY;

CREATE POLICY "team_invitations_select" ON public.team_invitations FOR SELECT USING (true);
CREATE POLICY "team_invitations_insert_admin" ON public.team_invitations FOR INSERT WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.team_members tm 
    WHERE tm.team_id = team_invitations.team_id 
    AND tm.user_id = auth.uid() 
    AND tm.role IN ('owner', 'admin')
  ) OR EXISTS (
    SELECT 1 FROM public.teams t 
    WHERE t.id = team_invitations.team_id 
    AND t.owner_id = auth.uid()
  )
);
CREATE POLICY "team_invitations_update" ON public.team_invitations FOR UPDATE USING (true);

-- ============================================
-- SHARED HISTORY TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS public.shared_history (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  team_id UUID NOT NULL REFERENCES public.teams(id) ON DELETE CASCADE,
  project_id UUID REFERENCES public.projects(id) ON DELETE SET NULL,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  action TEXT NOT NULL,
  details JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.shared_history ENABLE ROW LEVEL SECURITY;

CREATE POLICY "shared_history_select" ON public.shared_history FOR SELECT USING (
  EXISTS (
    SELECT 1 FROM public.team_members tm 
    WHERE tm.team_id = shared_history.team_id 
    AND tm.user_id = auth.uid()
  )
);
CREATE POLICY "shared_history_insert" ON public.shared_history FOR INSERT WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.team_members tm 
    WHERE tm.team_id = shared_history.team_id 
    AND tm.user_id = auth.uid()
  )
);

-- Add foreign key to projects for team_id
ALTER TABLE public.projects ADD CONSTRAINT projects_team_id_fkey 
  FOREIGN KEY (team_id) REFERENCES public.teams(id) ON DELETE SET NULL;

-- Update projects RLS to include team access
DROP POLICY IF EXISTS "projects_select_own" ON public.projects;
CREATE POLICY "projects_select_own_or_team" ON public.projects FOR SELECT USING (
  auth.uid() = user_id OR 
  (team_id IS NOT NULL AND EXISTS (
    SELECT 1 FROM public.team_members tm 
    WHERE tm.team_id = projects.team_id 
    AND tm.user_id = auth.uid()
  ))
);
