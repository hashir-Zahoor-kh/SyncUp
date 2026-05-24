-- ==========================================================================
-- SyncUp — Initial Schema
-- ==========================================================================
-- SECURITY INVARIANTS (enforced here, never weakened):
--   • RLS is enabled on EVERY table before any data is written.
--   • The service role key is NEVER exposed to the client. It lives only in
--     Edge Functions and the migration runner.
--   • All policies are documented with the access rule they enforce.
--   • INSERT into connections and invites is service-role only (no client policy).
-- ==========================================================================

-- ==========================================================================
-- HELPER: user_in_connection(p_connection_id UUID) → BOOLEAN
-- Returns TRUE when the JWT-identified user is a member of the given connection.
-- SECURITY DEFINER so it can read public.connections without the caller's RLS
-- context interfering — safe because auth.uid() is still the JWT user, not the
-- function owner.
-- ==========================================================================
CREATE OR REPLACE FUNCTION public.user_in_connection(p_connection_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
SECURITY DEFINER
STABLE
SET search_path = public, auth
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM   public.connections
    WHERE  id        = p_connection_id
    AND   (user_a_id = auth.uid() OR user_b_id = auth.uid())
  );
$$;

-- ==========================================================================
-- TABLE: profiles
-- 1-to-1 with auth.users; created automatically on signup via trigger.
-- Users can read and update only their own row.
-- Deletion cascades from auth.users; no direct-delete policy exists.
-- ==========================================================================
CREATE TABLE IF NOT EXISTS public.profiles (
  id             UUID        PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  display_name   TEXT        NOT NULL CHECK (char_length(display_name) BETWEEN 1 AND 50),
  avatar_color   TEXT        NOT NULL CHECK (
                               avatar_color IN (
                                 '#6C63FF','#FF6584','#43BF8E',
                                 '#FFB347','#4ECDC4','#FF6B6B'
                               )
                             ),
  is_pro         BOOLEAN     NOT NULL DEFAULT FALSE,
  created_at     TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at     TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- A user can read only their own profile.
CREATE POLICY "profiles_select_own"
  ON public.profiles FOR SELECT
  USING (auth.uid() = id);

-- A user can insert only their own profile row (also enforced by the trigger).
CREATE POLICY "profiles_insert_own"
  ON public.profiles FOR INSERT
  WITH CHECK (auth.uid() = id);

-- A user can update only their own profile.
CREATE POLICY "profiles_update_own"
  ON public.profiles FOR UPDATE
  USING  (auth.uid() = id)
  WITH CHECK (auth.uid() = id);

-- ==========================================================================
-- TABLE: connections
-- Pairs exactly two users. Both parties can SELECT.
-- INSERT/DELETE are performed by Edge Functions via the service role only;
-- there is intentionally NO INSERT policy for regular users.
-- ==========================================================================
CREATE TABLE IF NOT EXISTS public.connections (
  id                UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  user_a_id         UUID        NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  user_b_id         UUID        NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  relationship_type TEXT        NOT NULL CHECK (
                                  relationship_type IN (
                                    'Friends','Partners','Family','Workout Buddy'
                                  )
                                ),
  created_at        TIMESTAMPTZ NOT NULL DEFAULT now(),

  -- Prevent a user from connecting with themselves.
  CONSTRAINT connections_no_self CHECK (user_a_id != user_b_id)
);

-- Unique constraint: treat (A,B) and (B,A) as the same pair.
CREATE UNIQUE INDEX IF NOT EXISTS connections_unique_pair_idx
  ON public.connections (
    LEAST   (user_a_id::text, user_b_id::text),
    GREATEST(user_a_id::text, user_b_id::text)
  );

ALTER TABLE public.connections ENABLE ROW LEVEL SECURITY;

-- A user can read connections they are a member of.
CREATE POLICY "connections_select_member"
  ON public.connections FOR SELECT
  USING (auth.uid() = user_a_id OR auth.uid() = user_b_id);

-- No INSERT/UPDATE/DELETE policies — only the service role may create connections.

-- ==========================================================================
-- TABLE: goals
-- Belongs to one user, scoped to a connection and a week.
-- BOTH users in the connection can SELECT all goals in that connection.
-- Only the goal owner may INSERT/UPDATE/DELETE.
-- ==========================================================================
CREATE TABLE IF NOT EXISTS public.goals (
  id            UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id       UUID        NOT NULL REFERENCES auth.users(id)        ON DELETE CASCADE,
  connection_id UUID        NOT NULL REFERENCES public.connections(id) ON DELETE CASCADE,
  text          TEXT        NOT NULL CHECK (char_length(text) BETWEEN 1 AND 140),
  tag           TEXT        NOT NULL CHECK (tag IN ('Health','Focus','Life','Custom')),
  completed_at  TIMESTAMPTZ,
  week_start    DATE        NOT NULL,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS goals_connection_id_idx ON public.goals(connection_id);
CREATE INDEX IF NOT EXISTS goals_user_id_idx       ON public.goals(user_id);

ALTER TABLE public.goals ENABLE ROW LEVEL SECURITY;

-- Both users in the connection can read every goal in that connection.
CREATE POLICY "goals_select_connection_member"
  ON public.goals FOR SELECT
  USING (public.user_in_connection(connection_id));

-- A user may insert a goal for themselves only within their own connections.
CREATE POLICY "goals_insert_own"
  ON public.goals FOR INSERT
  WITH CHECK (
    auth.uid() = user_id
    AND public.user_in_connection(connection_id)
  );

-- A user may update only their own goals.
CREATE POLICY "goals_update_own"
  ON public.goals FOR UPDATE
  USING  (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- A user may delete only their own goals.
CREATE POLICY "goals_delete_own"
  ON public.goals FOR DELETE
  USING (auth.uid() = user_id);

-- ==========================================================================
-- TABLE: reactions
-- Emoji reactions from one user to another user's goal.
-- A user cannot react to their own goal.
-- Allowed emojis: 🎉 💪 🔥 (one per user per goal).
-- ==========================================================================
CREATE TABLE IF NOT EXISTS public.reactions (
  id           UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  goal_id      UUID        NOT NULL REFERENCES public.goals(id)   ON DELETE CASCADE,
  from_user_id UUID        NOT NULL REFERENCES auth.users(id)     ON DELETE CASCADE,
  emoji        TEXT        NOT NULL CHECK (emoji IN ('🎉','💪','🔥')),
  created_at   TIMESTAMPTZ NOT NULL DEFAULT now(),

  -- One reaction per user per goal.
  CONSTRAINT reactions_one_per_user UNIQUE (goal_id, from_user_id)
);

CREATE INDEX IF NOT EXISTS reactions_goal_id_idx ON public.reactions(goal_id);

ALTER TABLE public.reactions ENABLE ROW LEVEL SECURITY;

-- Users in the connection can read reactions on goals in that connection.
CREATE POLICY "reactions_select_connection_member"
  ON public.reactions FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.goals g
      WHERE  g.id = goal_id
      AND    public.user_in_connection(g.connection_id)
    )
  );

-- Users may react only to their partner's goals (not their own).
CREATE POLICY "reactions_insert_partner_goal"
  ON public.reactions FOR INSERT
  WITH CHECK (
    auth.uid() = from_user_id
    AND EXISTS (
      SELECT 1 FROM public.goals g
      WHERE  g.id        = goal_id
      AND    g.user_id  != auth.uid()
      AND    public.user_in_connection(g.connection_id)
    )
  );

-- A user may remove only their own reactions.
CREATE POLICY "reactions_delete_own"
  ON public.reactions FOR DELETE
  USING (auth.uid() = from_user_id);

-- ==========================================================================
-- TABLE: invites
-- Secure pairing tokens. Token is a UUID generated server-side (Edge Function).
-- The URL contains only the opaque token, never the inviter's user ID.
-- Acceptance is performed by an Edge Function via the service role.
-- ==========================================================================
CREATE TABLE IF NOT EXISTS public.invites (
  id               UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  token            UUID        NOT NULL DEFAULT gen_random_uuid(),
  inviter_user_id  UUID        NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at       TIMESTAMPTZ NOT NULL DEFAULT now(),
  expires_at       TIMESTAMPTZ NOT NULL,
  accepted         BOOLEAN     NOT NULL DEFAULT FALSE,
  accepted_by      UUID        REFERENCES auth.users(id) ON DELETE SET NULL,

  CONSTRAINT invites_token_unique UNIQUE (token)
);

ALTER TABLE public.invites ENABLE ROW LEVEL SECURITY;

-- An inviter can read the status of their own invites.
CREATE POLICY "invites_select_own"
  ON public.invites FOR SELECT
  USING (auth.uid() = inviter_user_id);

-- No INSERT/UPDATE/DELETE policies — all invite operations are through Edge Functions.

-- ==========================================================================
-- TABLE: push_tokens
-- Device push tokens scoped strictly to the owning user.
-- Payloads sent via push must contain NO personal content (enforced in Edge Function).
-- ==========================================================================
CREATE TABLE IF NOT EXISTS public.push_tokens (
  id         UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id    UUID        NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  token      TEXT        NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),

  CONSTRAINT push_tokens_user_unique UNIQUE (user_id)
);

ALTER TABLE public.push_tokens ENABLE ROW LEVEL SECURITY;

-- Users can manage only their own push tokens.
CREATE POLICY "push_tokens_select_own"
  ON public.push_tokens FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "push_tokens_insert_own"
  ON public.push_tokens FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "push_tokens_update_own"
  ON public.push_tokens FOR UPDATE
  USING  (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "push_tokens_delete_own"
  ON public.push_tokens FOR DELETE
  USING (auth.uid() = user_id);

-- ==========================================================================
-- TABLE: deletion_requests
-- Queue for account deletion processing (Apple App Store requirement).
-- Users can INSERT their own request; processing is service-role only.
-- Cascade from auth.users ensures cleanup if the user is deleted directly.
-- ==========================================================================
CREATE TABLE IF NOT EXISTS public.deletion_requests (
  id           UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id      UUID        NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  requested_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  processed_at TIMESTAMPTZ,

  CONSTRAINT deletion_requests_user_unique UNIQUE (user_id)
);

ALTER TABLE public.deletion_requests ENABLE ROW LEVEL SECURITY;

-- A user can insert their own deletion request.
CREATE POLICY "deletion_requests_insert_own"
  ON public.deletion_requests FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- A user can read the status of their own request.
CREATE POLICY "deletion_requests_select_own"
  ON public.deletion_requests FOR SELECT
  USING (auth.uid() = user_id);

-- UPDATE (marking processed) and DELETE are service-role only.

-- ==========================================================================
-- TRIGGER: auto-create a profile stub when a new auth user is created.
-- The full profile (display_name, avatar_color) is set during onboarding.
-- ==========================================================================
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (id, display_name, avatar_color)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'display_name', 'New User'),
    '#6C63FF'
  )
  ON CONFLICT (id) DO NOTHING;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();
