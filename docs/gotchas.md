# Patterns & Gotchas

## TypeScript

- `exactOptionalPropertyTypes: true` — optional props must be `prop?: Type | undefined`, not `prop?: Type`
- Supabase `Database` type: every table needs `Relationships: []` or the generic resolves to `never`
- All optional fields in `Database` Insert/Update types use `| undefined` explicitly

## Zod v4

- `z.enum([...], { message: '...' })` — not `errorMap`
- `z.literal(x, { message: '...' })` — same

## ESLint

- `expo/no-dynamic-env-var` fires on `process.env['KEY']` (bracket notation) — disable per-line in test files only; use dot notation `process.env.KEY` in source files
- `react-hooks/set-state-in-effect` is disabled for `src/contexts/**` (React Compiler rule too strict for async data-fetch contexts)
- `scripts/**` is ignored (Node.js CommonJS globals)

## npm installs

- Always use `--legacy-peer-deps` (React 19 peer conflict with most packages)

## Routing (Expo Router v4)

- `app/index.tsx` is the redirect hub — checks `loading`, `profileLoading`, `session`, `isOnboarded` in that order
- `(onboarding)/_layout.tsx` has `gestureEnabled: false` — no back-swipe out of onboarding
- `ProfileContext` waits for `authLoading` to resolve before fetching — prevents stale no-profile flash

## Phase 4 — Edge Functions

- `rate_limit_events` accumulates rows during test runs. If integration tests return unexpected 429s, run `DELETE FROM public.rate_limit_events;` in the Supabase SQL Editor.
- Edge Function tests skip gracefully if function returns 404 (not deployed).
- `accept_invite_atomic` is SECURITY DEFINER — do NOT grant execute to anon/authenticated roles.

## Phase 5 — Realtime

- `goals` table has `REPLICA IDENTITY FULL` and Realtime publication enabled — both required for RLS-filtered `postgres_changes` subscriptions.
- Realtime WebSocket tests permanently skipped in Jest (see `docs/testing.md`).
- Verify Realtime with: `npx ts-node scripts/verify-realtime.ts`

## Phase 6 — Edge Functions (self-contained)

- `create-goal` and `add-reaction` are deployed via Supabase Dashboard editor → must be **single-file** (no `_shared/` imports).
- `create-invite` and `accept-invite` use `_shared/` because they predate the dashboard-editor deployment approach.
- `send-push-notification` is triggered by DB webhooks, not JWT-authenticated HTTP calls — no CORS headers needed.

## Phase 6 — Rate Limiting

- `rate_limit_events` now has a `user_id` column (migration `20260527000000`). Existing IP-based rows have `user_id = NULL`.
- `create_goal` events: per-user, 30/hour
- `add_reaction` events: per-user, 60/hour
- `accept-invite` events: per-IP, 10/hour

## Deep Links

- Custom scheme: `syncup://invite/<token>`
- Universal Links: `https://trysyncup.org/i/<token>` — AASA at `public/.well-known/apple-app-site-association` has placeholder Team ID (`XXXXXXXXXX`) — replace in Phase 9.

## Custom SMTP (required before launch)

Supabase free tier limits auth emails to 3/hour. Before Phase 9 launch:

1. Create account at resend.com (free up to 3,000 emails/month)
2. Get API key
3. Go to Supabase Dashboard → Authentication → Settings → SMTP
4. Configure with Resend SMTP settings
5. Add `RESEND_API_KEY` to `.env.example`
