# Architecture

## Context Hierarchy

```
GestureHandlerRootView
  SafeAreaProvider
    AuthProvider          ← session, user, signIn/Up/Out, Apple Sign In
      ProfileProvider     ← profile, isOnboarded, updateProfile()
        DeepLinkHandler   ← handles syncup:// and https://trysyncup.org/i/ links
          [app routes]
            GoalProvider  ← goals, partnerGoals, Realtime subscription
              ReactionProvider ← reactions, Realtime subscription
```

## File Structure

```
app/
  _layout.tsx              Root: fonts → GestureHandlerRootView > … > DeepLinkHandler
  index.tsx                Redirect hub: auth → onboarding → (app) board
  (auth)/                  sign-in, sign-up, verify-email, reset-password
  (onboarding)/            setup.tsx — display name + avatar color picker
  (app)/
    _layout.tsx            3-tab navigator: Board, Activity, Profile
    index.tsx              Goal board (GoalProvider + ReactionProvider)
    activity.tsx           Activity feed
    invite.tsx             Invite card + iOS share sheet
    accept-invite.tsx      Token acceptance screen
    connected.tsx          Celebration screen (post-connection)

src/
  contexts/
    AuthContext.tsx
    ProfileContext.tsx
    GoalContext.tsx         Realtime goals subscription; addGoal → create-goal Edge Function
    ReactionContext.tsx     Realtime reactions subscription; addReaction → add-reaction Edge Function
  components/
    FormInput.tsx
    PrimaryButton.tsx
    PasswordStrengthMeter.tsx
    AvatarColorPicker.tsx
    GoalCard.tsx
    ReactionStrip.tsx
  hooks/
    usePushNotifications.ts
  schemas/
    auth.ts                signUpSchema, signInSchema, passwordSchema
    profile.ts             profileSchema, onboardingSchema, AVATAR_COLORS, CONNECTION_TYPES
    goal.ts                goalSchema, GOAL_TAGS
    reaction.ts            REACTION_EMOJIS, ReactionEmoji
  lib/
    supabase.ts            createClient with ExpoSecureStoreAdapter
    invite-link.ts         extractInviteToken() — parses syncup:// and https://trysyncup.org/i/
  types/
    database.ts            Full typed Database interface — all tables have Relationships: []

supabase/
  migrations/              SQL files — apply via SQL Editor (direct DB IP-restricted)
  functions/
    _shared/cors.ts        corsHeaders (used by create-invite, accept-invite only)
    _shared/database-types.ts  Minimal DB types for Phase 4 functions
    create-invite/         JWT-validated, max 3 pending invites, returns URL
    accept-invite/         Validates token, calls accept_invite_atomic RPC
    send-push-notification/ Webhook-triggered, notifies partner on goal complete/reaction
    create-goal/           JWT-validated, 30/hr rate limit per user, inserts goal
    add-reaction/          JWT-validated, 60/hr rate limit per user, upserts reaction

public/
  .well-known/
    apple-app-site-association  AASA (Team ID placeholder XXXXXXXXXX — finalize Phase 9)

scripts/
  verify-realtime.ts       Standalone Realtime verification (bypasses Jest WebSocket limitation)

__tests__/                 See docs/testing.md for full test file map
docs/
  testing.md
  gotchas.md
  architecture.md          (this file)
  phases/                  Implementation notes per phase
```

## Edge Function Deployment

| Function                 | Deployed via     | Pattern         |
| ------------------------ | ---------------- | --------------- |
| `create-invite`          | CLI / Dashboard  | Uses `_shared/` |
| `accept-invite`          | CLI / Dashboard  | Uses `_shared/` |
| `send-push-notification` | Dashboard editor | Self-contained  |
| `create-goal`            | Dashboard editor | Self-contained  |
| `add-reaction`           | Dashboard editor | Self-contained  |

**Dashboard editor = single-file only.** Do not add `_shared/` imports to self-contained functions.

## Supabase Webhooks

| Webhook                  | Trigger            | Target Function          |
| ------------------------ | ------------------ | ------------------------ |
| `notify_goal_completion` | `goals` UPDATE     | `send-push-notification` |
| `notify_reaction`        | `reactions` INSERT | `send-push-notification` |

Both webhooks send `x-webhook-secret` header validated inside the function.
