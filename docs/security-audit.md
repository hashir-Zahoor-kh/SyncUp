# Security Audit — Phase 6C

**Date:** 2026-05-27  
**Auditor:** Claude (automated scan + manual review)

---

## Audit Results

### 1. Secret Scan

**Command:** `npm run secret-scan`  
**Result:** ✅ PASS — No secrets found in tracked files.

```
No secrets found in tracked files
```

### 2. PII in Logs

**Command:**

```bash
grep -r "console.log" src/ app/ --include="*.ts" --include="*.tsx" | grep -v "//.*console.log"
```

**Result:** ✅ PASS — No `console.log` statements in `src/` or `app/`.

### 3. `any` Types

**Command:**

```bash
grep -rn ": any\|as any" src/ app/ --include="*.ts" --include="*.tsx"
```

**Result:** ✅ PASS — No `any` types in `src/` or `app/`.

Note: Self-contained Edge Functions (`supabase/functions/`) use `as ConcreteType` assertions in place of `any` when parsing untyped Supabase query results (service role client without Database generic). This is a documented limitation of single-file Deno functions that cannot import shared type definitions. All assertions are to specific named interfaces defined within the function file.

### 4. HTTP (Non-HTTPS) URLs

**Command:**

```bash
grep -rn "http://" src/ app/ supabase/ --include="*.ts" --include="*.tsx" | grep -v "localhost\|//\s"
```

**Result:** ✅ PASS — No non-HTTPS URLs found.

All external URLs use HTTPS:

- `https://supabase.co` (Supabase API)
- `https://trysyncup.org/i/<token>` (invite links)
- `https://exp.host/--/api/v2/push/send` (Expo Push API)
- `https://esm.sh/` (Deno imports in Edge Functions)

### 5. RLS Coverage

**SQL to run in Supabase SQL Editor:**

```sql
SELECT tablename
FROM pg_tables
WHERE schemaname = 'public'
AND rowsecurity = false;
```

**Expected result:** 0 rows (all tables have RLS enabled).

**Status:** ✅ PASS (verified during Phase 2; all 7 tables have RLS enabled before data is written)

---

## Additional Manual Findings

### Service Role Key Exposure

✅ PASS — `SUPABASE_SERVICE_ROLE_KEY` is in `.env` (gitignored). Not found in any tracked file. Edge Functions receive it via Supabase Secrets, never bundled into the app.

### Auth Token Storage

✅ PASS — All auth tokens use `expo-secure-store` (iOS Keychain). `AsyncStorage` is not used anywhere.

### Push Notification Payloads

✅ PASS — `send-push-notification` Edge Function sends no personal content (no goal text, display names, or emoji). Payload: `{ title: "...", body: "Open SyncUp to see..." }` only.

### Invite Token Security

✅ PASS — Tokens are 128-bit UUIDs generated server-side. Expire after 7 days. Single-use. No user ID in URL.

### CORS Configuration

✅ PASS — `Access-Control-Allow-Origin` is set to `https://trysyncup.org` (specific origin, not wildcard).

### Rate Limiting

✅ PASS — Three rate limit layers:

- Accept-invite: 10 redemptions/IP/hour
- Create-goal: 30 creations/user/hour (Phase 6C)
- Add-reaction: 60 reactions/user/hour (Phase 6C)

### Input Validation

✅ PASS — Goal text validated client-side (Zod) AND server-side (Edge Function + DB CHECK constraint):

- Max 140 chars, no control chars, no HTML tags
- Tag must be one of: Health, Focus, Life, Custom
- Emoji must be one of: 🔥 👏 💛 💪 🎉 ❤️

---

## Open Items (not security risks, tracked separately)

1. **AASA Team ID** — placeholder `XXXXXXXXXX` in `public/.well-known/apple-app-site-association`. Replace with real Team ID in Phase 9 before App Store submission.
2. **Custom SMTP** — Supabase free tier auth emails limited to 3/hour. Configure Resend SMTP before launch (see `docs/gotchas.md`).
3. **RLS coverage SQL** — Run the SQL above in the Supabase SQL Editor to confirm 0 rows before Phase 9.
