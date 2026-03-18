-- =============================================================================
-- LIKES FIX: One like per user per post, triggers update posts.likes_count
-- Run this entire block once in Supabase SQL Editor.
-- =============================================================================

-- 1) Ensure posts has likes_count column
ALTER TABLE public.posts
  ADD COLUMN IF NOT EXISTS likes_count integer DEFAULT 0;

-- 2) Remove duplicate likes (keep one row per post_id + user_id)
DELETE FROM public.post_likes a
USING public.post_likes b
WHERE a.ctid < b.ctid
  AND a.post_id = b.post_id
  AND a.user_id = b.user_id;

-- 3) Enforce one like per user per post (skip if constraint/index already exists)
DO $$
BEGIN
  ALTER TABLE public.post_likes
    ADD CONSTRAINT post_likes_post_user_unique UNIQUE (post_id, user_id);
EXCEPTION
  WHEN duplicate_object THEN NULL;
  WHEN SQLSTATE '42P07' THEN NULL;   -- relation already exists (e.g. index for constraint)
  WHEN OTHERS THEN NULL;
END $$;

-- 4) Trigger function: on INSERT into post_likes, increment posts.likes_count
CREATE OR REPLACE FUNCTION public.post_likes_after_insert()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  UPDATE public.posts
  SET likes_count = COALESCE(likes_count, 0) + 1
  WHERE id = NEW.post_id;
  RETURN NEW;
END;
$$;

-- 5) Trigger function: on DELETE from post_likes, decrement posts.likes_count
CREATE OR REPLACE FUNCTION public.post_likes_after_delete()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  UPDATE public.posts
  SET likes_count = GREATEST(COALESCE(likes_count, 0) - 1, 0)
  WHERE id = OLD.post_id;
  RETURN OLD;
END;
$$;

-- 6) Attach triggers to post_likes
DROP TRIGGER IF EXISTS post_likes_after_insert_trg ON public.post_likes;
CREATE TRIGGER post_likes_after_insert_trg
  AFTER INSERT ON public.post_likes
  FOR EACH ROW
  EXECUTE FUNCTION public.post_likes_after_insert();

DROP TRIGGER IF EXISTS post_likes_after_delete_trg ON public.post_likes;
CREATE TRIGGER post_likes_after_delete_trg
  AFTER DELETE ON public.post_likes
  FOR EACH ROW
  EXECUTE FUNCTION public.post_likes_after_delete();

-- 7) Sync current counts from post_likes (fix existing data)
UPDATE public.posts p
SET likes_count = (
  SELECT COUNT(*)::integer FROM public.post_likes pl WHERE pl.post_id = p.id
);
