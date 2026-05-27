-- Add user_id to rate_limit_events for per-user rate limiting (create_goal, add_reaction).
-- ip_address remains for IP-based accept-invite rate limiting.
-- user_id is nullable: existing IP-only rows are unaffected.

ALTER TABLE public.rate_limit_events
ADD COLUMN IF NOT EXISTS user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE;

-- Index for efficient per-user rate limit queries
CREATE INDEX IF NOT EXISTS rate_limit_events_user_idx
ON public.rate_limit_events (user_id, event_type, created_at);
