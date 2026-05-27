# Phase 6 — Reactions + Push Notifications + Rate Limiting

**Status:** ✅ Complete (Parts A, B, C)

## Part A — Reactions

- 6-emoji reactions: 🔥 👏 💛 💪 🎉 ❤️
- `ReactionContext` with Realtime subscription on `reactions` table
- `ReactionStrip` component
- RLS: only partner (not goal owner) can insert; owner can delete own
- `reactions` table: unique constraint (goal_id, from_user_id)

## Part B — Push Notifications

- `usePushNotifications` hook — registers Expo push token, saves to `push_tokens` table
- `send-push-notification` Edge Function — Expo Push API, no PII in payloads
- DB webhooks:
  - `notify_goal_completion` → triggers on `goals` UPDATE when `completed_at` changes
  - `notify_reaction` → triggers on `reactions` INSERT
- `SUPABASE_WEBHOOK_SECRET` in `.env` and Edge Function secrets
- Activity feed screen (`app/(app)/activity.tsx`)

## Part C — Pre-launch Hardening

- `create-goal` Edge Function: 30 goal creations/user/hour, server-side validation
- `add-reaction` Edge Function: 60 reactions/user/hour, self-reaction prevention
- `GoalContext.addGoal()` calls `create-goal` Edge Function
- `ReactionContext.addReaction()` calls `add-reaction` Edge Function
- `rate_limit_events.user_id` column added (migration `20260527000000`)
- CLAUDE.md slimmed to under 150 lines; `docs/` folder created
- Security audit passed (see `docs/security-audit.md`)
