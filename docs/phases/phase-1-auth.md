# Phase 1 — Auth

**Status:** ✅ Complete

## What was built

- Apple Sign In (`expo-apple-authentication`)
- Email/password auth with Zod validation
- Password strength meter
- Forgot password / reset flow
- Tokens stored in `expo-secure-store` (iOS Keychain) — never `AsyncStorage`
- `AuthContext` — session, user, signIn/Up/Out, Apple Sign In, password reset
- Screens: sign-in, sign-up, verify-email, reset-password
