## Profile timezone setting (UI + persistence only)

Surface the existing `user_profiles.timezone` and `user_profiles.timezone_pinned` columns in **Settings → Profile**, with a proper US-only dropdown and a "Pin this timezone" toggle. No behavior changes to calendar/dashboard rendering — those keep today's rules. A follow-up task will wire surfaces.

### Why this is small

- DB already has `timezone` (not null, default `America/New_York`) and `timezone_pinned` (not null, default `false`).
- `UserProfile` interface already carries `timezone`. Just need to add `timezone_pinned`.
- Auto-sync on login is already the de facto behavior per memory; we'll formalize it: write device tz to profile on session load **only when `timezone_pinned = false`**.

### Changes

**1. `src/lib/usTimezones.ts` (new)** — single source of truth so Settings and `FacilityDetailPage` share the list:
```ts
export const US_TIMEZONES = [
  { value: 'America/New_York',    label: 'Eastern (New York)' },
  { value: 'America/Chicago',     label: 'Central (Chicago)' },
  { value: 'America/Denver',      label: 'Mountain (Denver)' },
  { value: 'America/Phoenix',     label: 'Mountain — no DST (Phoenix)' },
  { value: 'America/Los_Angeles', label: 'Pacific (Los Angeles)' },
  { value: 'America/Anchorage',   label: 'Alaska (Anchorage)' },
  { value: 'Pacific/Honolulu',    label: 'Hawaii (Honolulu)' },
];
```

**2. `src/contexts/UserProfileContext.tsx`**
- Add `timezone_pinned: boolean` to `UserProfile` interface and `DEFAULT_PROFILE`.
- Hydrate it from the row read; include it in update payloads.
- On profile load, if `timezone_pinned === false` and `Intl…resolvedOptions().timeZone !== profile.timezone`, fire-and-forget update of `timezone` to the device value (no toast). Guarded by a one-shot ref so it doesn't loop.

**3. `src/pages/SettingsProfilePage.tsx`**
- Replace the free-text Timezone `Input` with:
  - `Select` populated from `US_TIMEZONES`.
  - Below it, a `Switch` + label: **"Pin this timezone"** with helper copy: *"When off, your timezone follows the device you're using. Pin it if you want to keep one timezone while traveling."*
  - When the switch flips on, save `{ timezone, timezone_pinned: true }`. When flipped off, save `{ timezone_pinned: false }` and immediately re-sync to device tz.
- Show the device tz in muted text under the dropdown when it differs from the saved value: *"Your device is currently in Europe/Rome."*
- Save button persists both fields together.

**4. `src/pages/FacilityDetailPage.tsx`**
- Replace inline tz `<SelectItem>` block with `US_TIMEZONES.map(...)` so we have one list.

**5. Tests** — `src/test/profileTimezone.test.ts` (light)
- US_TIMEZONES contains exactly 7 entries and includes `Pacific/Honolulu`.
- Pinning logic helper: `shouldAutoSyncTz({ pinned: false, profileTz, deviceTz })` returns `true` only when unpinned and tzs differ.

### Out of scope (explicit follow-ups)

- No changes to calendar grid, dashboard "Coming Up", time-block bucketing, or any rendering surface. Those still follow the existing rule ("shifts always in clinic tz; profile tz only used for personal anchors today").
- No migrations (columns already exist).
- No iCal/sync changes.

### Files touched

- `src/lib/usTimezones.ts` (new)
- `src/contexts/UserProfileContext.tsx`
- `src/pages/SettingsProfilePage.tsx`
- `src/pages/FacilityDetailPage.tsx`
- `src/test/profileTimezone.test.ts` (new)