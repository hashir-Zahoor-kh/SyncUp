# Phase 2 — Database Schema & RLS

**Status:** ✅ Complete

## What was built

- All 7 tables: `profiles`, `connections`, `goals`, `reactions`, `invites`, `push_tokens`, `deletion_requests`
- RLS enabled on every table before any data is written
- `user_in_connection(p_connection_id UUID)` — SECURITY DEFINER helper for goal/reaction RLS
- `handle_new_user()` trigger — auto-creates profile stub on auth.users INSERT
- Migration: `20260524000000_initial_schema.sql`
