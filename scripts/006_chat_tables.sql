-- AI Chat Tables

CREATE TABLE IF NOT EXISTS public.chat_conversations (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  title TEXT DEFAULT 'New Conversation',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.chat_conversations ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "chat_conversations_select_own" ON public.chat_conversations;
DROP POLICY IF EXISTS "chat_conversations_insert_own" ON public.chat_conversations;
DROP POLICY IF EXISTS "chat_conversations_update_own" ON public.chat_conversations;
DROP POLICY IF EXISTS "chat_conversations_delete_own" ON public.chat_conversations;
CREATE POLICY "chat_conversations_select_own" ON public.chat_conversations FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "chat_conversations_insert_own" ON public.chat_conversations FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "chat_conversations_update_own" ON public.chat_conversations FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "chat_conversations_delete_own" ON public.chat_conversations FOR DELETE USING (auth.uid() = user_id);

CREATE TABLE IF NOT EXISTS public.chat_messages (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  conversation_id UUID NOT NULL REFERENCES public.chat_conversations(id) ON DELETE CASCADE,
  role TEXT NOT NULL,
  content TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.chat_messages ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "chat_messages_select_own" ON public.chat_messages;
DROP POLICY IF EXISTS "chat_messages_insert_own" ON public.chat_messages;
CREATE POLICY "chat_messages_select_own" ON public.chat_messages FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "chat_messages_insert_own" ON public.chat_messages FOR INSERT WITH CHECK (auth.uid() = user_id);
