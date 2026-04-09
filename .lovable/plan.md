

# Fix: Auto-Advance Bug + Timezone Auto-Detection

## Bug Analysis

The auto-advance fires for **all** users, not just Google OAuth users. Here's why:

1. `timezone` is always truthy (initialized from `Intl.DateTimeFormat()`)
2. `userEmail` is always truthy for any logged-in user
3. `firstName`/`lastName` get set from `user.user_metadata` — which includes data from **email/password signup** too (the signup form collects first/last name and stores it in metadata)
4. So `allFilled` becomes `true` almost immediately, triggering `saveProfile()` after 1.5s — even for non-OAuth users

## Fix

### `src/pages/OnboardingPage.tsx`

1. **Gate auto-advance to Google OAuth users only**: Check `user?.app_metadata?.provider === 'google'` (or `user?.app_metadata?.providers?.includes('google')`) before enabling auto-advance. Email/password signups should never auto-advance.

2. **Timezone is already auto-detected** — it's initialized as `Intl.DateTimeFormat().resolvedOptions().timeZone` on line 71. The dropdown already shows the correct value. No change needed here; it's working as designed.

| Change | Detail |
|---|---|
| Add OAuth provider check | Wrap the auto-advance `useEffect` body with `const isOAuth = user?.app_metadata?.provider === 'google';` and only proceed if `isOAuth` is true |
| Keep timezone logic as-is | Already auto-detects from browser; dropdown allows override |

Single file change, ~3 lines modified.

