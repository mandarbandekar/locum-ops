## Goal

When a user signs in from a device whose timezone differs from their saved profile timezone, show a non-blocking prompt (similar to Google Calendar) asking whether to switch the profile timezone to the device's zone — instead of silently auto-syncing as we do today.

## Current behavior

`UserProfileContext` calls `shouldAutoSyncTz(...)` and, if the profile is unpinned and the device tz differs, it silently writes the device tz to the profile. There is no user-visible confirmation.

## New behavior

Replace the silent auto-sync with a prompt:

- **Trigger**: profile loaded, `timezone_pinned = false`, device tz is a supported US zone, and device tz ≠ profile tz.
- **UI**: a small dialog (shadcn `AlertDialog`) anchored near the top of the app shell, copy:
  > "Change time zone to (GMT-07:00) Pacific Time – Los Angeles?"
  Actions: **Yes**, **No**, **Never ask again**, **Settings**.
- **Actions**:
  - *Yes* → update `profile.timezone` to device tz (keep `timezone_pinned = false`).
  - *No* → dismiss for this session only (in-memory flag); ask again next session if mismatch persists.
  - *Never ask again* → set `timezone_pinned = true` so the user keeps their saved zone and we stop prompting; surface this in Settings → Profile so they can un-pin later.
  - *Settings* → navigate to `/settings/profile` (timezone section) and dismiss.
- **Throttling**: once dismissed in a session (No), don't re-prompt until next app load. Use sessionStorage key `tz-prompt-dismissed:<userId>:<deviceTz>`.
- **Non-US device tz**: don't prompt (timezone selector is US-only); fall through to existing behavior of leaving the profile zone untouched.
- **Demo mode**: skip prompt (matches current auto-sync skip).

## Implementation

1. **`src/lib/usTimezones.ts`**
   - Add a helper `formatTzLabel(tz)` returning a label like `(GMT-07:00) Pacific Time – Los Angeles` using `Intl.DateTimeFormat` with `timeZoneName: 'longOffset'` + the existing label map.
   - Add `shouldPromptTzChange({ pinned, profileTz, deviceTz, isSupportedUsTz })` mirroring `shouldAutoSyncTz` but gated on US support.

2. **`src/contexts/UserProfileContext.tsx`**
   - Remove the silent `updateProfile({ timezone: deviceTz })` auto-sync.
   - Expose new context values: `tzPromptOpen`, `devicePromptTz`, `acceptTzChange()`, `dismissTzChange()`, `neverAskTzChange()`.
   - Compute prompt visibility from the same inputs, plus sessionStorage dismissal check.

3. **`src/components/TimezoneChangePrompt.tsx`** (new)
   - Renders the AlertDialog only when `tzPromptOpen`.
   - Buttons wired to the three context actions + a `Settings` button using `useNavigate('/settings/profile')`.

4. **`src/components/Layout.tsx`** (or `App.tsx` if profile context is mounted there)
   - Mount `<TimezoneChangePrompt />` once so it appears on any authenticated route.

5. **Tests** — extend `src/test/profileTimezone.test.ts`:
   - `shouldPromptTzChange` returns true only when unpinned, US-supported device tz, and mismatch.
   - Returns false for non-US device tz, pinned profiles, matching zones.
   - `formatTzLabel('America/Los_Angeles')` contains "Pacific" and an offset.

## Out of scope

- Changing the US-only restriction.
- Per-device preferences beyond the "never ask again" pin.
- Auto-detecting clinic-tz vs profile-tz; this prompt only governs the user's profile zone.

## Memory updates

Update core memory line on profile timezone behavior to reflect: "Profile tz prompts on device change (unless pinned or dismissed); no silent sync."
