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
| 4     | Connections / Invite system  | ✅ COMPLETE |
| 5     | Goal board (CRUD + Realtime) | ✅ COMPLETE |
| 6     | Reactions                    | 🔲 NEXT     |
| 7     | Push notifications           | 🔲          |
| 8     | Paywall (RevenueCat)         | 🔲          |
| 9     | App Store submission         | 🔲          |
| 10    | Polish / hardening           | 🔲          |

**Phase 5 is complete. Phase 6 is next.**

---

## Blockers (items not yet in place)

- **RevenueCat account** → blocks Phase 8
- **Apple Developer Program account** → blocks Phase 9
- **App icon (1024×1024 PNG)** → blocks Phase 9

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
3. `20260524000002_invite_accept_atomic.sql` — adds `rate_limit_events` table, `accept_invite_atomic` RPC, `purge_old_rate_limit_events` function

### Phase 4 additions (applied to production)

**Edge Functions (live on Supabase):**

- `create-invite` — generates UUID v4 token, max 3 pending invites per user, JWT-validated, returns `https://trysyncup.org/i/<token>`
- `accept-invite` — validates token (not expired, not used, no self-accept, no duplicate connection), calls `accept_invite_atomic` RPC atomically, 10 attempts/IP/hour rate limit

**Additional tables:**

| Table               | Purpose                                                           |
| ------------------- | ----------------------------------------------------------------- |
| `rate_limit_events` | IP-based rate limiting for accept-invite (id, event_type, ip, ts) |

**Additional Postgres functions:**

- `accept_invite_atomic(p_token UUID, p_accepter_user_id UUID)` — atomic connection creation + invite invalidation; SECURITY DEFINER; do NOT grant execute to anon/authenticated
- `purge_old_rate_limit_events()` — cleans up rate_limit_events older than 1 hour

**New app screens:**

| File                          | Screen                                                        |
| ----------------------------- | ------------------------------------------------------------- |
| `app/(app)/invite.tsx`        | Invite card with native iOS share sheet                       |
| `app/(app)/accept-invite.tsx` | Token acceptance screen; receives token via navigation params |
| `app/(app)/connected.tsx`     | Celebration screen showing both user avatars                  |

**Deep linking:**

- Custom scheme: `syncup://invite/<token>` — live and working
- Universal Links: `https://trysyncup.org/i/<token>` — AASA at `public/.well-known/apple-app-site-association` (Team ID placeholder `XXXXXXXXXX`; finalize in Phase 9)
- `DeepLinkHandler` in `app/_layout.tsx` — handles links while app is running
- `app/index.tsx` — handles cold-launch deep links via `Linking.getInitialURL()` + SecureStore pending token

**Test counts (all passing):**

- Unit tests: 35
- Integration + security tests: 36
- Total: 71

**Design system (applied in Phase 4 review):**

- Fonts: `Fraunces_700Bold` (headings, logo) + `DMSans_400Regular` / `DMSans_700Bold` (body, UI)
- Loaded via `useFonts` in `app/_layout.tsx`; SplashScreen held until fonts are ready
- Packages: `@expo-google-fonts/fraunces`, `@expo-google-fonts/dm-sans`, `expo-font`, `expo-splash-screen`

---

## File Structure (key paths)

```
app/
  _layout.tsx              # Root: fonts → GestureHandlerRootView > SafeAreaProvider > AuthProvider > ProfileProvider > DeepLinkHandler
  index.tsx                # Redirect hub: checks auth + onboarding → routes to correct group; handles cold-launch deep links
  (auth)/                  # sign-in, sign-up, verify-email, reset-password
  (onboarding)/            # setup.tsx — display name + avatar color picker
  (app)/                   # index.tsx (board placeholder), invite.tsx, accept-invite.tsx, connected.tsx

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
    invite-link.ts          # extractInviteToken() — parses syncup:// and https://trysyncup.org/i/ URLs
  types/
    database.ts             # Full typed Database interface — ALL tables have Relationships: []

supabase/
  migrations/              # SQL files — apply via SQL Editor, not CLI
  functions/
    create-invite/          # Edge Function: generates invite token, returns URL
    accept-invite/          # Edge Function: validates token, creates connection atomically

public/
  .well-known/
    apple-app-site-association  # AASA for trysyncup.org Universal Links (Team ID placeholder)

__tests__/
  schemas/                 # Unit tests for Zod schemas
  auth/                    # supabase-auth.integration.test.ts (7 tests)
  profiles/                # profile.integration.test.ts (3 tests)
  security/                # rls.security.test.ts (7 tests — 5 required + 2 sanity)
  invites/                 # invite.integration.test.ts (edge function + accept flow tests)
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

### Phase 4 — Edge Functions & Testing

- `rate_limit_events` accumulates rows during test runs. If integration tests start returning 429 unexpectedly, run `DELETE FROM public.rate_limit_events;` in the Supabase SQL Editor.

### Phase 5 — Realtime WebSocket tests (known Jest limitation)

`@supabase/realtime-js` v2 requires `globalThis.WebSocket` at module-load time. Jest's `vm.createContext()` sandbox does not inherit Node.js v22+ native WebSocket, so Realtime subscriptions cannot connect inside Jest. Tests 4, 5, and 8 in `__tests__/goals/goal.integration.test.ts` are **permanently skipped** for this reason.

To verify Realtime end-to-end, run the standalone script (confirmed working — INSERT delivered <1s in diagnostic):

```bash
npx ts-node scripts/verify-realtime.ts
```

The script requires `.env` with all three Supabase credentials and creates/cleans up its own ephemeral test users. The `goals` table has `REPLICA IDENTITY FULL` and Realtime publication enabled; both are required for RLS-filtered `postgres_changes` subscriptions to deliver events.

- Edge Function tests require the functions to be deployed — they are skipped gracefully if the function URL returns a non-JSON response.
- Both Edge Functions are self-contained (no `_shared/` imports) because the Supabase dashboard editor requires single-file functions.
- The AASA file at `public/.well-known/apple-app-site-association` has a placeholder Team ID (`XXXXXXXXXX`) — replace with real Team ID in Phase 9.
- `accept_invite_atomic` is a SECURITY DEFINER Postgres function — do NOT grant direct execute to anon or authenticated roles.

### Design System

- Background: `#FBF7F2` (cream) — use on all screen backgrounds, never `#FAFAFA` or `#F5F3FF`
- Primary accent / buttons: `#D85A30` (coral)
- Ink / body text: `#2C2C2A`
- Success / teal: `#1D9E75`
- Soft accent background (secondary buttons, icon wells): `#FBEEE8`
- Card: white bg, `borderRadius: 14`, `borderWidth: 0.5`, `borderColor: '#E8E0D8'`
- Fonts: `Fraunces_700Bold` for logo + headings; `DMSans_400Regular` for body; `DMSans_700Bold` for buttons + bold labels
- `#6C63FF` is one of the 6 avatar color swatches — never use it as a UI accent color

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

## What Phase 5 Must Build

Phase 5 is the **Goal Board** — the core screen users see every day.

- Goal CRUD: add goal (bottom sheet, 140 char limit, tag picker), complete goal (tactile toggle + haptic feedback via `expo-haptics`), delete goal
- Real-time sync: Supabase Realtime subscription on `goals` table scoped to the user's connection — when User A checks off a goal, User B's screen updates within 2 seconds without a refresh
- Optimistic UI: checkbox feels instant, then confirmed by DB write
- Week view: 7-dot progress bar at top showing current day highlighted
- Progress rings: circular ring for each user (coral for self, teal for partner) showing weekly completion percentage
- Split sections: user's goals on top half, partner's goals on bottom half, each with their avatar and ring
- Pull to refresh
- Weekly reset: on Sunday midnight user-local time, archive completed goals and prompt for new ones
- Empty states: no goals yet, no connection yet, partner has no goals yet
- Bottom nav (3 tabs): Board, Activity, Profile — implement the `_layout.tsx` tab navigator in `(app)/`

**Security requirements for Phase 5:**

- Realtime subscription must be scoped to the user's connection (RLS enforces this — write a test that verifies User C cannot subscribe to A–B connection goals)
- Goal text sanitized before storage (already enforced by DB CHECK constraint + Zod)
- Cannot create a goal for a connection you are not part of (enforced by RLS `goals_insert_own` policy)

**Tests required for Phase 5:**

- Unit: goal schema validation (already exists, extend if needed)
- Integration: create goal → appears in DB with correct `user_id` and `connection_id`
- Integration: User A completes goal → `completed_at` is set in DB
- Integration: Realtime — User A creates goal → User B's subscription receives the event within 3 seconds
- Security: User C (not in A–B connection) cannot read goals from that connection
- Security: User C cannot insert a goal into the A–B connection
- E2E note: two simulators side by side showing real-time sync is the Phase 5 preview deliverable

---

## Git Configuration

Every commit in this repository must be authored under Hashir's identity. Before making any commit, always run:

```
git config user.name "Hashir Zahoor"
git config user.email "hashirzahoorurrahm@mail.adelphi.edu"
```

Never commit under Claude's name or any other identity. If you are about to commit and have not set these config values in this session, set them first. This applies to every single commit throughout the entire project without exception.
