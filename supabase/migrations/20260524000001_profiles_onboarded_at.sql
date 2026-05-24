-- Add onboarded_at to profiles.
-- NULL means the user has not completed the onboarding screen yet.
-- Set to now() when the user saves their display name and avatar color.
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS onboarded_at TIMESTAMPTZ;
