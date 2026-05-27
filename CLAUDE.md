@AGENTS.md

# SyncUp — Project Context

> Read this before writing any code. Full details in `docs/`.

## Phase Status

| Phase | Name                             | Status  |
| ----- | -------------------------------- | ------- |
| 0     | Scaffold                         | ✅      |
| 1     | Auth (Apple + email)             | ✅      |
| 2     | Database schema & RLS            | ✅      |
| 3     | Onboarding / Profile setup       | ✅      |
| 4     | Connections / Invite system      | ✅      |
| 5     | Goal board (CRUD + Realtime)     | ✅      |
| 6     | Reactions + Push + Rate limiting | ✅      |
| 7     | Paywall (RevenueCat)             | 🔲 NEXT |
| 8     | App Store submission             | 🔲      |
| 9     | Polish / hardening               | 🔲      |

## Blockers

- **RevenueCat account** → blocks Phase 7
- **Apple Developer Program account** → blocks Phase 8
- **App icon (1024×1024 PNG)** → blocks Phase 8

## Stack

| Layer      | Tool                                                                           |
| ---------- | ------------------------------------------------------------------------------ |
| Framework  | Expo SDK 56 + React Native 0.85.3                                              |
| Language   | TypeScript 6 strict (`noUncheckedIndexedAccess`, `exactOptionalPropertyTypes`) |
| Routing    | Expo Router v4                                                                 |
| Backend    | Supabase (auth, postgres, realtime, edge functions)                            |
| Auth       | `expo-apple-authentication` + email; tokens in `expo-secure-store`             |
| Validation | Zod v4                                                                         |
| Tests      | Jest 29 + jest-expo (unit) · node env (integration)                            |
| CI         | GitHub Actions                                                                 |

## Supabase

- **Project ref:** `ilykfwtiebfyaljlhsrx`
- **API URL:** `https://ilykfwtiebfyaljlhsrx.supabase.co`
- **Migrations:** paste SQL into Supabase Dashboard → SQL Editor (direct DB IP-restricted)

## Env Variables

| Variable                        | Used by                                 |
| ------------------------------- | --------------------------------------- |
| `EXPO_PUBLIC_SUPABASE_URL`      | Supabase client (bundled)               |
| `EXPO_PUBLIC_SUPABASE_ANON_KEY` | Supabase client (bundled)               |
| `SUPABASE_SERVICE_ROLE_KEY`     | Integration tests + Edge Functions only |
| `SUPABASE_DB_PASSWORD`          | `DATABASE_URL` construction             |
| `DATABASE_URL`                  | Migration runner (currently IP-blocked) |
| `SUPABASE_WEBHOOK_SECRET`       | `send-push-notification` Edge Function  |

## Commands

```bash
npm start                  # Expo dev server
npm test                   # Unit tests (jest-expo, RN env)
npm run test:integration   # Integration tests (node env) — requires live Supabase
npm run test:security      # RLS security tests only
npm run typecheck          # tsc --noEmit
npm run lint               # ESLint
npm run lint:fix           # ESLint --fix + prettier
npm run secret-scan        # Check tracked files for leaked secrets
```

## Database Tables

| Table               | Key RLS rule                                                  |
| ------------------- | ------------------------------------------------------------- |
| `profiles`          | Own row only (select/insert/update)                           |
| `connections`       | Members can SELECT; no client INSERT                          |
| `goals`             | Both members SELECT; only owner INSERT/UPDATE/DELETE          |
| `reactions`         | Members SELECT; only partner (not owner) INSERT; owner DELETE |
| `invites`           | Inviter SELECT own; no client INSERT                          |
| `push_tokens`       | Own row only (all ops)                                        |
| `deletion_requests` | Own row only (insert + select)                                |
| `rate_limit_events` | No client access; service role only                           |

## Tests

- Unit: 64 passing (`npm test`)
- Integration: ~57 passing, 3 skipped (`npm run test:integration`)
- See `docs/testing.md` for full details and known limitations

## Security Rules (NON-NEGOTIABLE)

- No `any` types
- RLS enabled on every table before data is written
- Service role key never in app bundle
- Auth tokens in `expo-secure-store` only
- No secrets in code — all in env vars
- No `console.log` of PII
- All inputs validated with Zod client-side AND server-side
- All Edge Functions validate JWT before processing
- No CORS wildcards
- ATS strict mode, no HTTP exceptions

## Git Configuration

Always set before committing:

```bash
git config user.name "Hashir Zahoor"
git config user.email "hashirzahoorurrahm@mail.adelphi.edu"
```

## Known Limitations

- Realtime WebSocket tests permanently skipped in Jest — see `docs/gotchas.md`
- Direct DB connection IP-restricted — use SQL Editor for migrations

## What Phase 7 Must Build

RevenueCat paywall:

- Install `react-native-purchases` + configure RevenueCat project
- `is_pro` field on `profiles` table gates premium features
- Paywall sheet: free vs. pro tiers, subscription options
- `ProfileContext` exposes `isPro` derived from `profile.is_pro`
- Webhook: RevenueCat → Supabase Edge Function to update `is_pro` on subscription events
- Requires RevenueCat account (currently a blocker)

## For Full Details

- Architecture & file structure: `docs/architecture.md`
- Testing infrastructure: `docs/testing.md`
- Patterns & gotchas: `docs/gotchas.md`
- Phase implementation history: `docs/phases/`
- Security audit: `docs/security-audit.md`
