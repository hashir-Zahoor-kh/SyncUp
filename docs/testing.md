# Testing Infrastructure

## Two Separate Jest Configs

| Config                       | Command                    | Environment      | Covers                                       |
| ---------------------------- | -------------------------- | ---------------- | -------------------------------------------- |
| `jest.config.js`             | `npm test`                 | `jest-expo` (RN) | Schemas, components, unit logic              |
| `jest.integration.config.js` | `npm run test:integration` | Node             | Supabase auth, profiles, RLS, edge functions |

**Do not mix them.** Integration tests import Node globals (`fs`, `path`) that break in the RN environment.

## Current Test Counts (Phase 6C)

- Unit: 64 passing (`npm test`)
- Integration: ~57 passing, 3 skipped (`npm run test:integration`)
- Total: ~121 passing

## Integration Test Conventions

- Always use `adminClient.auth.admin.createUser({ email_confirm: true })` — never `anon.auth.signUp()` (hits email rate limit)
- Test emails: `something-${RUN_ID}@example.com` where `RUN_ID = Date.now().toString(36)`
- Add `// eslint-disable-next-line expo/no-dynamic-env-var` before every `process.env['KEY']` access
- Clean up all test users in `afterAll` via `adminClient.auth.admin.deleteUser()`
- Edge Function tests probe the URL in `beforeAll` and skip gracefully if function returns 404

## Known Limitation: Realtime WebSocket Tests

`@supabase/realtime-js` v2 requires `globalThis.WebSocket` at module-load time. Jest's `vm.createContext()` sandbox does not inherit Node.js v22+ native WebSocket, so Realtime subscriptions cannot connect inside Jest. Tests 4, 5, and 8 in `__tests__/goals/goal.integration.test.ts` are **permanently skipped**.

To verify Realtime end-to-end:

```bash
npx ts-node scripts/verify-realtime.ts
```

## Transient Auth Rate Limits

Supabase free tier caps auth sign-ins. If `profile.integration.test.ts` sporadically fails with "Request rate limit reached", it is a transient infrastructure issue — not a code bug. Re-run the individual test in isolation:

```bash
npm run test:integration -- --testPathPattern="profiles/profile"
```

## Rate Limit Events Cleanup

`rate_limit_events` accumulates rows during test runs. If integration tests start returning 429 unexpectedly, run in the Supabase SQL Editor:

```sql
DELETE FROM public.rate_limit_events;
```

## Test File Map

| Path                                                       | Type        | What it tests                              |
| ---------------------------------------------------------- | ----------- | ------------------------------------------ |
| `__tests__/auth/password-validation.test.ts`               | Unit        | Password schema rules                      |
| `__tests__/auth/supabase-auth.integration.test.ts`         | Integration | Auth flows (signUp, signIn, resetPassword) |
| `__tests__/schemas/auth.test.ts`                           | Unit        | Zod auth schemas                           |
| `__tests__/schemas/profile.test.ts`                        | Unit        | Zod profile/onboarding schemas             |
| `__tests__/schemas/goal.test.ts`                           | Unit        | Zod goal schema, tag validation            |
| `__tests__/components/goal-card.test.tsx`                  | Unit        | GoalCard rendering                         |
| `__tests__/components/week-bar.test.tsx`                   | Unit        | WeekBar progress display                   |
| `__tests__/components/avatar.test.tsx`                     | Unit        | Avatar rendering                           |
| `__tests__/components/reaction-strip.test.tsx`             | Unit        | ReactionStrip component                    |
| `__tests__/notifications/push-notifications.unit.test.tsx` | Unit        | usePushNotifications hook                  |
| `__tests__/goals/goal.unit.test.ts`                        | Unit        | Goal schema validation                     |
| `__tests__/goals/goal.integration.test.ts`                 | Integration | Goal CRUD, security, Realtime (3 skipped)  |
| `__tests__/invites/create-invite.integration.test.ts`      | Integration | create-invite Edge Function                |
| `__tests__/invites/accept-invite.integration.test.ts`      | Integration | accept-invite Edge Function                |
| `__tests__/notifications/push-tokens.integration.test.ts`  | Integration | Push token storage                         |
| `__tests__/profiles/profile.integration.test.ts`           | Integration | Profile CRUD, RLS                          |
| `__tests__/profiles/avatar.integration.test.ts`            | Integration | Avatar update                              |
| `__tests__/reactions/reaction.integration.test.ts`         | Integration | Reaction CRUD, RLS                         |
| `__tests__/security/rls.security.test.ts`                  | Security    | RLS policies (Phases 0–5)                  |
| `__tests__/security/rls-phase4.security.test.ts`           | Security    | RLS policies (Phase 4 additions)           |
| `__tests__/rate-limiting/rate-limit.integration.test.ts`   | Integration | Rate limiting (create-goal, add-reaction)  |
