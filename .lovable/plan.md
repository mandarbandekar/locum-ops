

# Skip Profile Step for Google OAuth Users

## Rationale

For Google OAuth users, all profile fields (name, email, timezone) are already known. Showing a step that auto-advances after 1.5s is confusing — it flashes content the user can't meaningfully interact with. Better to save the profile silently and land them directly on Step 2 with a personalized welcome header.

## Changes

### `src/pages/OnboardingPage.tsx`

1. **On mount / phase init**: If `user?.app_metadata?.provider === 'google'` and profile fields are all available, silently call `updateProfile(...)` and set initial phase to `'manual_facility'` instead of `'profile'`. No timer, no flash.

2. **Step 2 welcome banner**: When the user arrived via OAuth skip, show a welcome header at the top of the `manual_facility` step:
   - "Welcome, [First Name]! 👋"  
   - "Let's set up your workspace — start by adding a clinic you work with."
   - For non-OAuth users (who came through Step 1 normally), keep the current headline: "Add a clinic you work with"

3. **Remove auto-advance logic**: Delete the `useEffect` that sets `showWelcome` and the 1.5s `setTimeout`. Remove `autoAdvanceRef`, `showWelcome`, `userEdited`, and `cancelAutoAdvance` — none are needed anymore.

4. **Progress bar**: For OAuth-skipped users, still show step 1 as complete (start progress at step 2 of 5). The `PHASE_STEP` mapping already handles this since `manual_facility` = step 2.

5. **Back button on Step 2**: For OAuth users who skipped Step 1, the back button should still go to `'profile'` so they can edit their name/timezone if needed. No change to `PHASE_BACK` needed — it already maps `manual_facility → profile`.

| Area | Detail |
|---|---|
| Initial phase logic | Check OAuth provider + metadata on mount, silently save profile, start at `manual_facility` |
| Step 2 header | Conditional welcome message for OAuth users |
| Cleanup | Remove auto-advance timer, `showWelcome`, `userEdited`, `cancelAutoAdvance`, `autoAdvanceRef` |
| File | `src/pages/OnboardingPage.tsx` only |

