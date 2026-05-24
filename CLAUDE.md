@AGENTS.md

# SyncUp — Project Context

> **Read this before writing any code.** This file is the single source of truth for a new session picking up mid-build.

---

## What This App Is

SyncUp is a production iOS app for sharing weekly goals between exactly two connected users (partners, friends, family). Each user sets up to N goals per week; both users see each other's goals in real time and can react with emoji. Built for the App Store — every phase ends with an `APPROVED` gate before the next begins.

---

## Phase Status

| Phase | Name                         | Status      |
| ----- | ---------------------------- | ----------- |
| 0     | Scaffold                     | ✅ COMPLETE |
| 1     | Auth (Apple + email)         | ✅ COMPLETE |
| 2     | Database schema & RLS        | ✅ COMPLETE |
| 3     | Onboarding / Profile setup   | ✅ COMPLETE |
| 4     | Connections / Invite system  | 🔲 NEXT     |
| 5     | Goal board (CRUD + Realtime) | 🔲          |
| 6     | Reactions                    | 🔲          |
| 7     | Push notifications           | 🔲          |
| 8     | Paywall (RevenueCat)         | 🔲          |
| 9     | App Store submission         | 🔲          |
| 10    | Polish / hardening           | 🔲          |

**Phase 4 is next.** Do not begin it until the user types `APPROVED`.

---

## Blockers (items not yet in place)

- **RevenueCat account** → blocks Phase 8
- **Apple Developer Program account** → blocks Phase 9
- **App icon (1024×1024) + App Store name** → blocks Phase 9

---

## Tech Stack

| Layer      | Choice                                                                                                        |
| ---------- | ------------------------------------------------------------------------------------------------------------- |
| Framework  | Expo SDK 56 (`expo@~56.0.4`) + React Native 0.85.3                                                            |
| Language   | TypeScript 6 — strict mode + `noUncheckedIndexedAccess` + `noImplicitOverride` + `exactOptionalPropertyTypes` |
| Routing    | Expo Router v4 (file-based, typed routes enabled)                                                             |
| Backend    | Supabase (auth, postgres, realtime, edge functions)                                                           |
| Auth       | `expo-apple-authentication` + email/password; tokens in `expo-secure-store` (iOS Keychain)                    |
| Validation | Zod v4 — `errorMap` API removed, use `{ message: '...' }` directly                                            |
| Forms      | `react-hook-form` + `@hookform/resolvers/zod`                                                                 |
| Tests      | Jest 29 + jest-expo (unit/component) · separate node-env config for integration/security tests                |
| E2E        | Detox 20 (configured, not yet run)                                                                            |
| Linting    | ESLint v9 flat config (`eslint.config.js`) — **not** `.eslintrc.js`                                           |
| CI         | GitHub Actions (`.github/workflows/ci.yml`)                                                                   |

---

## Supabase Project

- **Project ref:** `ilykfwtiebfyaljlhsrx`
- **API URL:** `https://ilykfwtiebfyaljlhsrx.supabase.co`
- **Direct DB connection:** not reachable from local network (IP-restricted). Use the Supabase SQL Editor for migrations.
- **Migration method:** paste SQL into Supabase Dashboard → SQL Editor. Files live in `supabase/migrations/` for version control.

---

## Environment Variables

All in `.env` (gitignored). **Never commit values.**

| Variable                        | Used by                                                                              |
| ------------------------------- | ------------------------------------------------------------------------------------ |
| `EXPO_PUBLIC_SUPABASE_URL`      | Supabase client (bundled into app)                                                   |
| `EXPO_PUBLIC_SUPABASE_ANON_KEY` | Supabase client (bundled into app)                                                   |
| `SUPABASE_SERVICE_ROLE_KEY`     | Integration/security tests + Edge Functions only. Never in app bundle.               |
| `SUPABASE_DB_PASSWORD`          | Used to construct `DATABASE_URL`                                                     |
| `DATABASE_URL`                  | Migration runner (`npm run migrate`) — currently unreachable; use SQL Editor instead |

---

## Key Commands

```bash
npm start                  # Expo dev server
npm test                   # Unit tests (jest-expo, RN env) — excludes integration + security
npm run test:integration   # All integration tests (node env) — requires live Supabase
npm run test:security      # RLS security tests only
npm run typecheck          # tsc --noEmit
npm run lint               # ESLint
npm run lint:fix           # ESLint --fix + prettier
npm run secret-scan        # Grep tracked files for leaked secrets
npm run migrate            # Apply migrations via pg (currently blocked by network)
```

---

## Database Schema (applied to production)

All migrations are in `supabase/migrations/`. Applied manually via SQL Editor.

### Tables

| Table               | Key RLS rules                                                                                         |
| ------------------- | ----------------------------------------------------------------------------------------------------- |
| `profiles`          | Own row only (select/insert/update). `onboarded_at TIMESTAMPTZ` = NULL until onboarding screen saved. |
| `connections`       | Members can SELECT. No client INSERT — service role only.                                             |
| `goals`             | Both connection members can SELECT. Only owner can INSERT/UPDATE/DELETE.                              |
| `reactions`         | Connection members can SELECT. Only partner (not goal owner) can INSERT. Owner can DELETE own.        |
| `invites`           | Inviter can SELECT own. No client INSERT — Edge Function only.                                        |
| `push_tokens`       | Own row only (all ops).                                                                               |
| `deletion_requests` | Own row only (insert + select). Processing is service-role only.                                      |

### Key functions / triggers

- `public.user_in_connection(p_connection_id UUID)` — SECURITY DEFINER, STABLE; used in goal/reaction RLS policies
- `public.handle_new_user()` trigger — fires on `auth.users` INSERT; auto-creates `profiles` stub with `display_name = 'New User'`, `onboarded_at = NULL`

### Migrations applied

1. `20260524000000_initial_schema.sql` — all 7 tables, RLS, policies, helper function, trigger
2. `20260524000001_profiles_onboarded_at.sql` — adds `onboarded_at TIMESTAMPTZ` to profiles

---

## File Structure (key paths)

```
app/
  _layout.tsx              # Root: GestureHandlerRootView > SafeAreaProvider > AuthProvider > ProfileProvider
  index.tsx                # Redirect hub: checks auth + onboarding → routes to correct group
  (auth)/                  # sign-in, sign-up, verify-email, reset-password
  (onboarding)/            # setup.tsx — display name + avatar color picker
  (app)/                   # index.tsx — goal board placeholder (Phase 5)

src/
  contexts/
    AuthContext.tsx         # session, user, signIn/Up/Out, Apple Sign In, password reset
    ProfileContext.tsx      # profile, isOnboarded, updateProfile()
  components/
    FormInput.tsx
    PrimaryButton.tsx
    PasswordStrengthMeter.tsx
    AvatarColorPicker.tsx
  schemas/
    auth.ts                 # signUpSchema, signInSchema, passwordSchema (Zod v4)
    profile.ts              # profileSchema, onboardingSchema, AVATAR_COLORS, CONNECTION_TYPES
    goal.ts                 # goalSchema, GOAL_TAGS
  lib/
    supabase.ts             # createClient with ExpoSecureStoreAdapter
  types/
    database.ts             # Full typed Database interface — ALL tables have Relationships: []

supabase/
  migrations/              # SQL files — apply via SQL Editor, not CLI
  functions/               # Edge Functions (none yet)

__tests__/
  schemas/                 # Unit tests for Zod schemas
  auth/                    # supabase-auth.integration.test.ts (7 tests)
  profiles/                # profile.integration.test.ts (3 tests)
  security/                # rls.security.test.ts (7 tests — 5 required + 2 sanity)
```

---

## Test Infrastructure

Two separate Jest configs — **do not mix them**:

| Config                       | Command                    | Environment      | Covers                          |
| ---------------------------- | -------------------------- | ---------------- | ------------------------------- |
| `jest.config.js`             | `npm test`                 | `jest-expo` (RN) | Schemas, components, unit logic |
| `jest.integration.config.js` | `npm run test:integration` | Node             | Supabase auth, profiles, RLS    |

**Integration test conventions:**

- Always use `adminClient.auth.admin.createUser({ email_confirm: true })` — never `anon.auth.signUp()` (hits email rate limit)
- Test emails: `something-${RUN_ID}@example.com` pattern
- Add `// eslint-disable-next-line expo/no-dynamic-env-var` before every `process.env['KEY']` access in test files
- Clean up all test users in `afterAll` via `adminClient.auth.admin.deleteUser()`

---

## Established Patterns & Gotchas

### TypeScript

- `exactOptionalPropertyTypes: true` — optional props must be typed `prop?: Type | undefined`, not `prop?: Type`
- Supabase `Database` type: every table needs `Relationships: []` or the generic resolves to `never`
- All optional fields in `Database` Insert/Update types use `| undefined` explicitly

### Zod v4

- `z.enum([...], { message: '...' })` — not `errorMap`
- `z.literal(x, { message: '...' })` — same

### ESLint

- `expo/no-dynamic-env-var` fires on `process.env['KEY']` — disable per-line in test files only
- `react-hooks/set-state-in-effect` is disabled for `src/contexts/**` (React Compiler rule too strict for async data-fetch contexts)
- `scripts/**` is ignored (Node.js CommonJS globals)

### npm installs

- Always use `--legacy-peer-deps` (React 19 peer conflict with most packages)

### Routing (Expo Router)

- `app/index.tsx` is the redirect hub — checks `loading`, `profileLoading`, `session`, `isOnboarded` in that order
- `(onboarding)/_layout.tsx` has `gestureEnabled: false` — no back-swipe out of onboarding
- `ProfileContext` waits for `authLoading` to resolve before fetching — prevents stale no-profile flash

### Security (NON-NEGOTIABLE — never weaken)

- No `any` types
- RLS enabled on every table before data is written
- Service role key never in app bundle — only in Edge Functions and test env vars
- Auth tokens in `expo-secure-store` only, never `AsyncStorage`
- No secrets in code — all in env vars
- No `console.log` of PII (emails, names, goal text, tokens)
- Invite tokens: 128-bit UUID, server-side only, expire 7 days, single-use, URL contains opaque token only
- Push notification payloads contain no personal content
- All inputs validated with Zod client-side AND server-side
- Goal text: max 140 chars, no control chars, no HTML
- Names: max 50 chars, Unicode-safe, no HTML
- ATS strict mode, no HTTP exceptions
- All Edge Functions validate JWT before processing
- No CORS wildcards
- Rate limit: 5 failed auth attempts/email/15 min · 10 invite redemptions/IP/hour

---

## What Phase 4 Must Build

Phase 4 is the **Connections / Invite system**:

- Edge Function: `create-invite` — generates UUID token, inserts into `invites` (service role), returns opaque URL
- Edge Function: `accept-invite` — validates token (not expired, not used), creates connection, marks invite accepted
- Invite link format: `syncup://invite/{token}` — token only, never inviter ID
- Deep link handling in the app (Expo Router)
- "Invite your partner" screen
- "You're connected!" confirmation screen
- The `connections` table has no client INSERT policy — all connection creation goes through the Edge Function
- Universal Links domain: **`trysyncup.org`** — configure `apple-app-site-association` at `https://trysyncup.org/.well-known/apple-app-site-association`
- Custom scheme fallback: `syncup://invite/{token}` (works before Universal Links are live)
