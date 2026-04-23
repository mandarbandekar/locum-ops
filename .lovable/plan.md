

## De-emphasize timezone in onboarding Step 1

### What's happening today

Timezone is **not** asked at account creation — sign-up only collects name, email, password (and profession). However, on **Step 1 of onboarding** ("Add a clinic you work with") we render a prominent grey banner above the page title:

> *Hi Mandar! Timezone: Eastern · Change*

The timezone is already auto-detected from the browser via `Intl.DateTimeFormat().resolvedOptions().timeZone` and saved to the profile on mount. The banner is purely a "confirm/change" affordance — but it's the very first thing the user reads, before the actual task. That's the friction the screenshot calls out.

### The change

Auto-detect silently and remove the timezone confirmation from the onboarding header. Move the "Change timezone" control to where it belongs — **Settings → Profile** (where it already exists) — so users who travel or were mis-detected can correct it without it competing with the primary onboarding task.

**New Step 1 header becomes:**
```
Hi Mandar!

Add a clinic you work with
Start with one clinic you work with regularly...
STEP 1 OF 4
```

Just the greeting + the task. Timezone disappears from view.

### How detection still works

- On onboarding mount, `OnboardingPage` keeps the existing `updateProfile({ timezone: detectedTimezone })` call. The detected zone is silently saved on first load.
- For users where `Intl` returns a non-US zone (rare, but possible for VPN users or travelers), we fall back to `America/New_York` since the product is US-only (per the regional-settings constraint).
- If the user later realizes the zone is wrong (e.g. they travel often or their browser reports the wrong region), they edit it in **Settings → Profile**, where the timezone selector already lives with the full US-only list.

### Optional safety net

If we want to keep a one-line escape hatch on Step 1 without it dominating the header, we can add a tiny tertiary link at the very bottom of the form area:

> *Detected timezone: Eastern. Wrong? Change in Settings.*

Set in muted-foreground, smaller font, below the primary CTA. This is a single-line nicety, not a UI element competing with the task. **Default plan: include this.** Easy to remove if it feels like clutter.

### Files

- `src/pages/OnboardingPage.tsx`
  - Remove the timezone display block (`Timezone: {getTimezoneLabel(timezone)}` + the inline `Select`/edit button) from the Step 1 header.
  - Keep the silent `updateProfile({ timezone: detectedTimezone })` on mount and the existing sync `useEffect`.
  - Remove `editingTimezone` state and the `TIMEZONE_OPTIONS` constant (no longer used here).
  - Add the small "Detected timezone: X. Change in Settings." footnote at the bottom of the Step 1 view (links to `/settings/profile`).
  - Keep passing `timezone` into `OnboardingTaxStep` (Step 4 still needs it for projections) — read it from `profile?.timezone` instead of local state.

### Untouched

- Sign-up flow (`WelcomePage`, `LoginPage`, Google OAuth) — never asked for timezone, no change.
- `Settings → Profile` timezone selector — unchanged, remains the canonical place to edit.
- Tax projection logic in Step 4 — still uses the (now silently-detected) timezone.
- US-only timezone constraint — preserved.

### Verification after fix

- New sign-up → Onboarding Step 1 shows only "Hi Mandar!" + the task title. No timezone chip.
- Profile in DB has `timezone` set to the browser-detected value (e.g. `America/New_York`) without user interaction.
- Settings → Profile shows the detected timezone pre-selected; user can change it freely.

