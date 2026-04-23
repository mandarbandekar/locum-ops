

## Fix: Google sign-in shouldn't show a second sign-up screen

### The bug

After a new user signs in with Google, `AuthenticatedApp` checks `profile?.has_seen_welcome`. Because the profile is freshly created with `has_seen_welcome: false`, the user is routed to `/welcome` — which renders `WelcomePage`, a **full email/password sign-up form** ("Create your Locum Ops account" with first name, last name, email, password fields).

The OAuth user is already authenticated, so being asked to sign up again is wrong. If they tried to submit, `supabase.auth.signUp()` would fail with "user already registered."

`WelcomePage` is doing two unrelated jobs:
1. It's the email/password **sign-up form** (linked to from `LoginPage`).
2. It's gated as a one-time **welcome screen** for any authenticated user without `has_seen_welcome = true`.

Job #1 should never show to an already-authenticated user. Job #2 shouldn't be a sign-up form at all.

### The fix

Two-part:

**1. Skip the welcome gate for OAuth sign-ups.** In `loadProfile` (`src/contexts/UserProfileContext.tsx`), when we *create* a new profile row and detect the user came from an OAuth provider (auth metadata has `provider`/`iss` of google or apple, or `full_name`/`name` populated by Google), set `has_seen_welcome: true` on the insert. They've already cleared the equivalent of the welcome screen via the OAuth consent flow — there's nothing for them to fill in.

**2. Make `WelcomePage` safe even if it's reached.** Add an early redirect at the top of `WelcomePage`: if `useAuth().user` exists (i.e. the user is already signed in), call `updateProfile({ has_seen_welcome: true })` and `navigate('/onboarding', { replace: true })`. This guarantees no authenticated user ever sees the duplicate sign-up form, even from stale tabs, deep links, or any future regression.

Net effect for new Google users: Google consent → land directly on `/onboarding` step 1 (Add a clinic). No intermediate dead-end screen.

### Untouched

- Email/password sign-up flow from `LoginPage` → still works (those users start unauthenticated, see `WelcomePage` form, submit, get email confirmation).
- Existing users with `has_seen_welcome: true` → unchanged.
- `LoginPage` Google button (`lovable.auth.signInWithOAuth`) → no changes needed; the bug is purely in the post-auth gating.
- `AuthenticatedApp` routing logic → unchanged; we just ensure OAuth users have `has_seen_welcome = true` so the existing branch lets them through to onboarding.

### Files

- `src/contexts/UserProfileContext.tsx` — in `loadProfile`'s "no profile row exists" branch, detect OAuth signup via `authUser.app_metadata.provider !== 'email'` (or presence of `meta.full_name`/`meta.name`) and set `has_seen_welcome: true` on insert. Reflect the same value in the local `setProfile` call.
- `src/pages/WelcomePage.tsx` — add a `useEffect` at top: if `user` is truthy, call `updateProfile({ has_seen_welcome: true })` and `navigate('/onboarding', { replace: true })` immediately. Render `null` while redirecting.

### Verification after fix

- New Google sign-in → straight to `/onboarding` (Add a clinic step), never sees `WelcomePage`.
- New email sign-up via `LoginPage` → unchanged flow (confirmation email → log in → welcome handled correctly).
- Existing accounts → no change in behavior.

