-- Phase 5A: Avatar overhaul — add emoji and photo URL support to profiles

ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS avatar_emoji TEXT CHECK (char_length(avatar_emoji) <= 10),
  ADD COLUMN IF NOT EXISTS avatar_url   TEXT CHECK (char_length(avatar_url)   <= 500);

ALTER TABLE public.profiles
  ALTER COLUMN avatar_color DROP NOT NULL;

ALTER TABLE public.profiles
  ADD CONSTRAINT profiles_avatar_check
  CHECK (
    avatar_color IS NOT NULL OR
    avatar_emoji IS NOT NULL OR
    avatar_url   IS NOT NULL
  );
