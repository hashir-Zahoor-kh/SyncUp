# Phase 5 — Goal Board (CRUD + Realtime)

**Status:** ✅ Complete

## What was built

- `GoalContext` with Realtime subscription scoped to user's connection
- Goal CRUD: add (bottom sheet, 140-char limit, tag picker), complete (haptic), delete
- Optimistic UI: checkbox instant, confirmed by DB write
- Week view: 7-dot progress bar showing current day
- Progress rings: coral (self) and teal (partner) showing weekly completion %
- Split sections: user's goals / partner's goals with avatar + ring
- Pull to refresh
- Bottom nav: 3 tabs (Board, Activity, Profile)
- `GoalCard` component, `WeekBar` component
- Realtime verified via `scripts/verify-realtime.ts` (INSERT delivered <1s)
- `goals` table has `REPLICA IDENTITY FULL` and Realtime publication enabled

## Known limitation

Realtime WebSocket tests permanently skipped in Jest (Node.js WebSocket sandbox issue). See `docs/testing.md`.
