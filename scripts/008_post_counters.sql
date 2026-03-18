-- Post counters: likes_count, comments_count, reposts_count on public.posts
-- Run in Supabase SQL Editor. Uses SECURITY DEFINER so RLS doesn't block the trigger UPDATE.
-- Ensures one like per user per post (UNIQUE) and cleans duplicate likes.

-- Ensure columns exist
ALTER TABLE public.posts
  ADD COLUMN IF NOT EXISTS likes_count integer DEFAULT 0,
  ADD COLUMN IF NOT EXISTS comments_count integer DEFAULT 0,
  ADD COLUMN IF NOT EXISTS reposts_count integer DEFAULT 0,
  ADD COLUMN IF NOT EXISTS repost_of uuid REFERENCES public.posts(id) ON DELETE SET NULL;

-- ========== One like per user per post (enforce and clean) ==========
-- 1) Remove duplicate likes so each (post_id, user_id) appears only once
DELETE FROM public.post_likes a
USING public.post_likes b
WHERE a.ctid < b.ctid AND a.post_id = b.post_id AND a.user_id = b.user_id;

-- 2) Enforce one like per user per post (ignore error if constraint already exists)
DO $$
BEGIN
  ALTER TABLE public.post_likes ADD CONSTRAINT post_likes_post_user_unique UNIQUE (post_id, user_id);
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

-- ========== LIKES (on post_likes) ==========
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

-- ========== COMMENTS (on post_comments) ==========
CREATE OR REPLACE FUNCTION public.post_comments_after_insert()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  UPDATE public.posts
  SET comments_count = COALESCE(comments_count, 0) + 1
  WHERE id = NEW.post_id;
  RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION public.post_comments_after_delete()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  UPDATE public.posts
  SET comments_count = GREATEST(COALESCE(comments_count, 0) - 1, 0)
  WHERE id = OLD.post_id;
  RETURN OLD;
END;
$$;

DROP TRIGGER IF EXISTS post_comments_after_insert_trg ON public.post_comments;
CREATE TRIGGER post_comments_after_insert_trg
  AFTER INSERT ON public.post_comments
  FOR EACH ROW
  EXECUTE FUNCTION public.post_comments_after_insert();

DROP TRIGGER IF EXISTS post_comments_after_delete_trg ON public.post_comments;
CREATE TRIGGER post_comments_after_delete_trg
  AFTER DELETE ON public.post_comments
  FOR EACH ROW
  EXECUTE FUNCTION public.post_comments_after_delete();

-- ========== REPOSTS (on posts) ==========
CREATE OR REPLACE FUNCTION public.post_reposts_after_insert()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.repost_of IS NOT NULL THEN
    UPDATE public.posts
    SET reposts_count = COALESCE(reposts_count, 0) + 1
    WHERE id = NEW.repost_of;
  END IF;
  RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION public.post_reposts_after_delete()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF OLD.repost_of IS NOT NULL THEN
    UPDATE public.posts
    SET reposts_count = GREATEST(COALESCE(reposts_count, 0) - 1, 0)
    WHERE id = OLD.repost_of;
  END IF;
  RETURN OLD;
END;
$$;

DROP TRIGGER IF EXISTS post_reposts_after_insert_trg ON public.posts;
CREATE TRIGGER post_reposts_after_insert_trg
  AFTER INSERT ON public.posts
  FOR EACH ROW
  EXECUTE FUNCTION public.post_reposts_after_insert();

DROP TRIGGER IF EXISTS post_reposts_after_delete_trg ON public.posts;
CREATE TRIGGER post_reposts_after_delete_trg
  AFTER DELETE ON public.posts
  FOR EACH ROW
  EXECUTE FUNCTION public.post_reposts_after_delete();

-- ========== One-time sync: set counts from current data ==========
UPDATE public.posts p
SET likes_count = (SELECT COUNT(*) FROM public.post_likes pl WHERE pl.post_id = p.id);

UPDATE public.posts p
SET comments_count = (SELECT COUNT(*) FROM public.post_comments pc WHERE pc.post_id = p.id);

UPDATE public.posts p
SET reposts_count = (SELECT COUNT(*) FROM public.posts r WHERE r.repost_of = p.id);
