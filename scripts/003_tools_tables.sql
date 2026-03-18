-- Tools and Snippets Tables

CREATE TABLE IF NOT EXISTS public.tools (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL UNIQUE,
  type TEXT NOT NULL,
  description TEXT,
  icon TEXT,
  config JSONB DEFAULT '{}',
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.tools ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "tools_select_all" ON public.tools;
CREATE POLICY "tools_select_all" ON public.tools FOR SELECT USING (true);

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
DROP POLICY IF EXISTS "user_tools_select_own" ON public.user_tools;
DROP POLICY IF EXISTS "user_tools_insert_own" ON public.user_tools;
DROP POLICY IF EXISTS "user_tools_update_own" ON public.user_tools;
DROP POLICY IF EXISTS "user_tools_delete_own" ON public.user_tools;
CREATE POLICY "user_tools_select_own" ON public.user_tools FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "user_tools_insert_own" ON public.user_tools FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "user_tools_update_own" ON public.user_tools FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "user_tools_delete_own" ON public.user_tools FOR DELETE USING (auth.uid() = user_id);

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
DROP POLICY IF EXISTS "snippets_select_own" ON public.snippets;
DROP POLICY IF EXISTS "snippets_select_public" ON public.snippets;
DROP POLICY IF EXISTS "snippets_insert_own" ON public.snippets;
DROP POLICY IF EXISTS "snippets_update_own" ON public.snippets;
DROP POLICY IF EXISTS "snippets_delete_own" ON public.snippets;
CREATE POLICY "snippets_select_own" ON public.snippets FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "snippets_select_public" ON public.snippets FOR SELECT USING (is_public = true);
CREATE POLICY "snippets_insert_own" ON public.snippets FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "snippets_update_own" ON public.snippets FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "snippets_delete_own" ON public.snippets FOR DELETE USING (auth.uid() = user_id);

-- Seed default tools
INSERT INTO public.tools (name, type, description, icon) VALUES
  ('Code Editor', 'editor', 'Monaco-based code editor with syntax highlighting', 'code'),
  ('Terminal', 'terminal', 'Interactive terminal console', 'terminal'),
  ('Documentation Generator', 'docs', 'Auto-generate documentation from code', 'file-text'),
  ('Snippet Manager', 'snippets', 'Save and organize code snippets', 'bookmark')
ON CONFLICT (name) DO NOTHING;
