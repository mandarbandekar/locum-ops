

# Welcome Screen for New Users

## Overview
Add a full-screen welcome page that appears once for new users after signup, before the onboarding wizard. It previews what setup involves (3 steps, ~5 min), then offers "Let's Get Started" (enters onboarding) or "I'll explore on my own" (skips to dashboard).

## How It Works

### Flag: `has_seen_welcome`
- Add a `has_seen_welcome` boolean column (default `false`) to the `user_profiles` table via migration
- Add it to the `UserProfile` interface and context — read it during profile load, expose it
- The welcome screen sets it to `true` on either CTA click

### Routing Logic (in `AuthenticatedApp` / `App.tsx`)
Current flow: `needsOnboarding` → `/onboarding` → steps begin.
New flow:
1. If `needsOnboarding` AND `!has_seen_welcome` → render `/welcome` (the new page)
2. If `needsOnboarding` AND `has_seen_welcome` → render `/onboarding` (existing flow)
3. If onboarding complete → normal app

### New Page: `src/pages/WelcomePage.tsx`
- Full-screen, no sidebar/header — standalone page like login
- Content matches the exact copy provided: headline, subheadline, value prop box, 3 setup steps with icons and time badges, total time indicator, two CTAs
- "Let's Get Started" → sets `has_seen_welcome: true` via `updateProfile`, navigates to `/onboarding`
- "I'll explore on my own" → sets `has_seen_welcome: true` AND calls `completeOnboarding()`, navigates to `/`
- Mobile-first responsive layout, consistent with existing dark theme and brand colors

### Existing Users
- The migration defaults `has_seen_welcome` to `false`, but since existing users already have `onboarding_completed_at` set, the welcome screen gate is never reached — they go straight to the dashboard

## Files Modified
- **Migration**: Add `has_seen_welcome boolean default false` to `user_profiles`
- `src/contexts/UserProfileContext.tsx` — add `has_seen_welcome` to interface, load/expose it
- `src/pages/WelcomePage.tsx` — new file, the welcome screen
- `src/App.tsx` — add welcome route and gate logic in `AuthenticatedApp`

## No other files affected
The existing onboarding flow remains unchanged. The welcome screen is purely additive.

