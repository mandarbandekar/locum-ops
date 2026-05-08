
## Goal

A relief vet who lives in Alabama (CST) but works clinics in both AL and PA (EST) should never have to fiddle with timezone settings. Each shift should display in **the clinic's local time** (so "9am at Allentown Vet" always reads as 9am no matter where she is), conflicts should be detected in **absolute UTC** (so a 9–5 EST shift and a 9–5 CST shift on the same day are correctly seen as 1 hour apart, not overlapping), and her **profile timezone** should silently track her device so tax/state inference stays accurate when she travels.

## What changes for the user

**Schedule, dashboard, invoice line items, ICS feed, reminder emails:**
- Each shift card / row shows the time in **the clinic's timezone**, with a small `EST` / `CST` chip next to it.
- When the clinic's timezone differs from the user's current device timezone, a muted secondary line shows `(8:00 AM your time)` so travel-day context is still clear.
- Calendar grid (week/day views) places shifts on the slot matching the clinic's local wall clock — same as today for single-timezone users, no visible change for them.

**Adding/editing a shift:**
- The time picker is labeled with the selected clinic's timezone (e.g. *"Start time — Allentown Vet, EST"*). What the user types is what the clinic sees. No mental math.
- If no clinic is selected yet, picker falls back to device timezone with a hint.

**Conflict detection:**
- Two overlapping shifts at clinics in different timezones are now compared on the real (UTC) timeline. A 9am–5pm EST shift in PA and a 9am–5pm CST shift in AL on the same date no longer flag as a conflict (they're an hour apart in real time). A 9am–5pm EST and an 8am–4pm CST *would* flag (they overlap in real time).

**Profile timezone:**
- On every sign-in, we silently compare the device's IANA timezone to the stored profile timezone. If different, we update the profile in the background. No prompt, no banner.
- The Settings → Profile field becomes a read-only display ("Detected: America/Chicago — updates automatically when you travel") with an "Override" link for the rare user who wants to pin it manually.
- This keeps tax-state inference accurate (Marianne stays mapped to Alabama whether she's home or visiting PA for a week).

## Out of scope

- Letting users manually pick a display timezone other than clinic-local. Decided: clinic-local is the single source of truth for display.
- Changing how shifts are stored. They remain ISO datetime strings; we just interpret them with the clinic's timezone.
- Changing facility timezone selection UX (still US-only, still set on clinic creation).

## Technical sketch

```text
storage layer       →  shift.start_datetime stays ISO; semantics shift
                       from "user-local wall clock" to "clinic-local
                       wall clock" — same string, clearer meaning.

new lib             →  src/lib/shiftTimezone.ts
                       - getShiftDisplay(shift, facility, deviceTz)
                         → { primary: '9:00 AM', tzAbbr: 'EST',
                             secondary: '8:00 AM CST' | null }
                       - getShiftAbsoluteRange(shift, facility)
                         → { startUtcMs, endUtcMs }   // for conflicts

businessLogic.ts    →  detectShiftConflictsDetailed switches from
                       toLocalSlot() to getShiftAbsoluteRange().
                       Signature gains a facilities lookup (id → tz).

shift form          →  time inputs read facility.timezone; label shows
                       the abbr. On save, compose ISO using that tz
                       (date-fns-tz zonedTimeToUtc).

display surfaces    →  UpcomingShiftsStrip, SchedulePage calendar,
                       shift list rows, invoice line item description,
                       confirmation emails, ICS feed (DTSTART;TZID=...).

profile sync        →  AuthContext / UserProfileContext: on session
                       init, read Intl.DateTimeFormat().resolvedOptions()
                       .timeZone; if !== profile.timezone && profile is
                       not manually pinned, updateProfile silently.
                       Add user_profiles.timezone_pinned boolean.

settings page       →  Replace plain Input with read-only chip + tiny
                       "Override" link → opens dialog with US tz select.
```

Library: add `date-fns-tz` (already a date-fns ecosystem, ~3KB). All conflict math goes through `getShiftAbsoluteRange` so a single helper is the source of truth.

## Migration

- Add `user_profiles.timezone_pinned boolean default false`.
- Existing shift datetimes are reinterpreted under the new "clinic-local wall clock" semantic. For single-timezone users (the vast majority today, including demo Sarah Mitchell), nothing visibly changes because device tz === clinic tz. For Marianne-style users with cross-tz clinics, existing shifts may shift by an hour on screen — we'll add a one-time banner on the Schedule page for users with clinics in multiple timezones, asking them to spot-check 1–2 PA shifts.

## Memory updates

- Update `mem://constraints/regional-settings` and add `mem://tech/timezone-handling` capturing: clinic-local display, UTC conflict math, auto-detect profile tz with manual override.
