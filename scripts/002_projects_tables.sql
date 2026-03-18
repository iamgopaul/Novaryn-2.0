-- Projects and Services Tables

CREATE TABLE IF NOT EXISTS public.projects (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  team_id UUID,
  name TEXT NOT NULL,
  description TEXT,
  status TEXT DEFAULT 'active',
  sdlc_phase TEXT DEFAULT 'planning',
  repository_url TEXT,
  tech_stack TEXT[],
  priority TEXT DEFAULT 'medium',
  due_date TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.projects ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "projects_select_own" ON public.projects;
DROP POLICY IF EXISTS "projects_insert_own" ON public.projects;
DROP POLICY IF EXISTS "projects_update_own" ON public.projects;
DROP POLICY IF EXISTS "projects_delete_own" ON public.projects;
CREATE POLICY "projects_select_own" ON public.projects FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "projects_insert_own" ON public.projects FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "projects_update_own" ON public.projects FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "projects_delete_own" ON public.projects FOR DELETE USING (auth.uid() = user_id);

CREATE TABLE IF NOT EXISTS public.services (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  project_id UUID NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  type TEXT NOT NULL,
  description TEXT,
  config JSONB DEFAULT '{}',
  status TEXT DEFAULT 'active',
  endpoint_url TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.services ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "services_select_own" ON public.services;
DROP POLICY IF EXISTS "services_insert_own" ON public.services;
DROP POLICY IF EXISTS "services_update_own" ON public.services;
DROP POLICY IF EXISTS "services_delete_own" ON public.services;
CREATE POLICY "services_select_own" ON public.services FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "services_insert_own" ON public.services FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "services_update_own" ON public.services FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "services_delete_own" ON public.services FOR DELETE USING (auth.uid() = user_id);
