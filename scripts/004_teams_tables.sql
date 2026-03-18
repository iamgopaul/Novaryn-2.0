-- Teams and Collaboration Tables

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

CREATE TABLE IF NOT EXISTS public.team_members (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  team_id UUID NOT NULL REFERENCES public.teams(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role TEXT DEFAULT 'member',
  joined_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(team_id, user_id)
);

ALTER TABLE public.team_members ENABLE ROW LEVEL SECURITY;

-- Teams policies (simplified)
DROP POLICY IF EXISTS "teams_select_all" ON public.teams;
DROP POLICY IF EXISTS "teams_insert_own" ON public.teams;
DROP POLICY IF EXISTS "teams_update_owner" ON public.teams;
DROP POLICY IF EXISTS "teams_delete_owner" ON public.teams;
CREATE POLICY "teams_select_all" ON public.teams FOR SELECT USING (true);
CREATE POLICY "teams_insert_own" ON public.teams FOR INSERT WITH CHECK (auth.uid() = owner_id);
CREATE POLICY "teams_update_owner" ON public.teams FOR UPDATE USING (auth.uid() = owner_id);
CREATE POLICY "teams_delete_owner" ON public.teams FOR DELETE USING (auth.uid() = owner_id);

-- Team members policies
DROP POLICY IF EXISTS "team_members_select_all" ON public.team_members;
DROP POLICY IF EXISTS "team_members_insert_own" ON public.team_members;
DROP POLICY IF EXISTS "team_members_update_own" ON public.team_members;
DROP POLICY IF EXISTS "team_members_delete_own" ON public.team_members;
CREATE POLICY "team_members_select_all" ON public.team_members FOR SELECT USING (true);
CREATE POLICY "team_members_insert_own" ON public.team_members FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "team_members_update_own" ON public.team_members FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "team_members_delete_own" ON public.team_members FOR DELETE USING (auth.uid() = user_id);

CREATE TABLE IF NOT EXISTS public.team_invitations (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  team_id UUID NOT NULL REFERENCES public.teams(id) ON DELETE CASCADE,
  email TEXT NOT NULL,
  invited_by UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  status TEXT DEFAULT 'pending',
  token TEXT NOT NULL UNIQUE,
  expires_at TIMESTAMPTZ NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.team_invitations ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "team_invitations_select_all" ON public.team_invitations;
DROP POLICY IF EXISTS "team_invitations_insert_own" ON public.team_invitations;
DROP POLICY IF EXISTS "team_invitations_update_all" ON public.team_invitations;
CREATE POLICY "team_invitations_select_all" ON public.team_invitations FOR SELECT USING (true);
CREATE POLICY "team_invitations_insert_own" ON public.team_invitations FOR INSERT WITH CHECK (auth.uid() = invited_by);
CREATE POLICY "team_invitations_update_all" ON public.team_invitations FOR UPDATE USING (true);

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
DROP POLICY IF EXISTS "shared_history_select_all" ON public.shared_history;
DROP POLICY IF EXISTS "shared_history_insert_own" ON public.shared_history;
CREATE POLICY "shared_history_select_all" ON public.shared_history FOR SELECT USING (true);
CREATE POLICY "shared_history_insert_own" ON public.shared_history FOR INSERT WITH CHECK (auth.uid() = user_id);
