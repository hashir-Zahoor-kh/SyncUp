# Phase 4 — Connections / Invite System

**Status:** ✅ Complete

## What was built

- `create-invite` Edge Function: UUID token, max 3 pending invites, 7-day expiry
- `accept-invite` Edge Function: validates token, no self-accept, no duplicate connection, 10/IP/hour rate limit
- `accept_invite_atomic` Postgres SECURITY DEFINER function — atomic connection creation
- `rate_limit_events` table for IP-based rate limiting
- Deep links: `syncup://invite/<token>` + Universal Links `https://trysyncup.org/i/<token>`
- AASA at `public/.well-known/apple-app-site-association` (Team ID placeholder XXXXXXXXXX)
- Screens: `invite.tsx`, `accept-invite.tsx`, `connected.tsx`
- Design system applied: Fraunces + DM Sans fonts, coral (#D85A30) accent, cream (#FBF7F2) background
- Migration: `20260524000002_invite_accept_atomic.sql`
