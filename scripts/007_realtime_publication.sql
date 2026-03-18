-- Enable Supabase Realtime for community and messaging tables.
-- Run this in the Supabase SQL Editor (Dashboard → SQL Editor) if Realtime
-- is not already enabled for these tables (Dashboard → Database → Replication).

ALTER PUBLICATION supabase_realtime ADD TABLE public.posts;
ALTER PUBLICATION supabase_realtime ADD TABLE public.post_likes;
ALTER PUBLICATION supabase_realtime ADD TABLE public.private_messages;

-- If a table was already added, you'll see an error for that line; you can run
-- the other lines or enable the tables via Dashboard → Database → Replication.
