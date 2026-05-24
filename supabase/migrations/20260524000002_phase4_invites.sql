-- Phase 4: Connections & Invite System
-- Run this in the Supabase SQL Editor:
-- https://supabase.com/dashboard/project/ilykfwtiebfyaljlhsrx/sql/new

-- ── Indexes for invites table ──────────────────────────────────────────────
CREATE INDEX IF NOT EXISTS invites_token_idx
  ON public.invites(token);

CREATE INDEX IF NOT EXISTS invites_inviter_idx
  ON public.invites(inviter_user_id);

-- Partial index for pending-invite count checks (rate limiting in create-invite)
CREATE INDEX IF NOT EXISTS invites_pending_idx
  ON public.invites(inviter_user_id, expires_at)
  WHERE accepted = false;

-- ── Rate limit events table ────────────────────────────────────────────────
-- Used by the accept-invite Edge Function for IP-based rate limiting.
-- Only accessed via service role; no client access policies.
CREATE TABLE IF NOT EXISTS public.rate_limit_events (
  id         uuid        DEFAULT gen_random_uuid() PRIMARY KEY,
  event_type text        NOT NULL,
  ip_address text        NOT NULL,
  created_at timestamptz DEFAULT now() NOT NULL
);

ALTER TABLE public.rate_limit_events ENABLE ROW LEVEL SECURITY;
-- No RLS policies → no access for anon/authenticated roles; service role bypasses RLS.

CREATE INDEX IF NOT EXISTS rate_limit_events_lookup_idx
  ON public.rate_limit_events(event_type, ip_address, created_at DESC);

-- Auto-purge rows older than 24 hours to keep table small.
-- This is a best-effort cleanup called from the Edge Function; not a cron job.

-- ── accept_invite_atomic RPC ───────────────────────────────────────────────
-- Validates the token and creates the connection in a single transaction.
-- Prevents race conditions (two users accepting the same invite simultaneously).
-- Only callable by service_role (Edge Functions); not accessible to clients.
CREATE OR REPLACE FUNCTION public.accept_invite_atomic(
  p_token             uuid,
  p_accepter_user_id  uuid
)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_invite           RECORD;
  v_connection_id    uuid;
  v_connection_count int;
  v_partner_name     text;
  v_partner_color    text;
BEGIN
  -- Lock the invite row to prevent concurrent acceptance of the same token.
  SELECT * INTO v_invite
  FROM public.invites
  WHERE token = p_token
  FOR UPDATE;

  -- Treat nonexistent, already-accepted, and expired tokens identically
  -- to prevent timing-based enumeration attacks.
  IF NOT FOUND OR v_invite.accepted OR v_invite.expires_at <= now() THEN
    RETURN json_build_object('result', 'invalid_token');
  END IF;

  -- Self-acceptance check (distinct error — token validity is already confirmed).
  IF v_invite.inviter_user_id = p_accepter_user_id THEN
    RETURN json_build_object('result', 'self_accept');
  END IF;

  -- Duplicate connection check (both directions).
  SELECT COUNT(*) INTO v_connection_count
  FROM public.connections
  WHERE (user_a_id = v_invite.inviter_user_id AND user_b_id = p_accepter_user_id)
     OR (user_a_id = p_accepter_user_id AND user_b_id = v_invite.inviter_user_id);

  IF v_connection_count > 0 THEN
    RETURN json_build_object('result', 'already_connected');
  END IF;

  -- All validations passed — create connection and mark invite accepted atomically.
  v_connection_id := gen_random_uuid();

  INSERT INTO public.connections (id, user_a_id, user_b_id, relationship_type)
  VALUES (v_connection_id, v_invite.inviter_user_id, p_accepter_user_id, 'Friends');

  UPDATE public.invites
  SET accepted    = true,
      accepted_by = p_accepter_user_id
  WHERE id = v_invite.id;

  -- Fetch inviter profile to return alongside the connection ID.
  SELECT display_name, avatar_color
  INTO v_partner_name, v_partner_color
  FROM public.profiles
  WHERE id = v_invite.inviter_user_id;

  RETURN json_build_object(
    'result',               'success',
    'connection_id',        v_connection_id,
    'partner_name',         COALESCE(v_partner_name, 'Your partner'),
    'partner_avatar_color', COALESCE(v_partner_color, '#6C63FF')
  );
END;
$$;

-- Restrict execution to service_role only (Edge Functions).
REVOKE ALL ON FUNCTION public.accept_invite_atomic(uuid, uuid) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.accept_invite_atomic(uuid, uuid) FROM authenticated;
REVOKE ALL ON FUNCTION public.accept_invite_atomic(uuid, uuid) FROM anon;
GRANT EXECUTE ON FUNCTION public.accept_invite_atomic(uuid, uuid) TO service_role;

-- ── Cleanup helper (called by Edge Function, not a cron) ──────────────────
-- Removes rate_limit_events older than 2 hours to keep the table lean.
CREATE OR REPLACE FUNCTION public.purge_old_rate_limit_events()
RETURNS void
LANGUAGE sql
SECURITY DEFINER
AS $$
  DELETE FROM public.rate_limit_events
  WHERE created_at < now() - interval '2 hours';
$$;

REVOKE ALL ON FUNCTION public.purge_old_rate_limit_events() FROM PUBLIC;
REVOKE ALL ON FUNCTION public.purge_old_rate_limit_events() FROM authenticated;
REVOKE ALL ON FUNCTION public.purge_old_rate_limit_events() FROM anon;
GRANT EXECUTE ON FUNCTION public.purge_old_rate_limit_events() TO service_role;
