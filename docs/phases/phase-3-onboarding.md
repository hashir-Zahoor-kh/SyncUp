# Phase 3 — Onboarding / Profile Setup

**Status:** ✅ Complete

## What was built

- Onboarding screen: display name + avatar color picker (6 swatches)
- `ProfileContext` — profile, isOnboarded, updateProfile()
- `profiles.onboarded_at` TIMESTAMPTZ column — NULL until setup screen saved
- Migration: `20260524000001_profiles_onboarded_at.sql`
- Routing: `(onboarding)/setup.tsx` with `gestureEnabled: false` (no back-swipe)
- `ProfileContext` waits for `authLoading` before fetching — prevents stale flash
