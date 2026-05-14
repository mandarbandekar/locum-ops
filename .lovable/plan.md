## Timezone-aware shift form

### Current state

`ShiftFormDialog` already saves via `zonedWallClockToUtc(date, time, facility.timezone)` and reads back via `formatYMDInTz` / `formatHHMMInTz`. So the **persistence path is correct** today: a "May 27, 8:00 AM" entry for an LA clinic is stored as the right UTC instant whether you're in San Francisco or Rome.

What's missing are the **defaults, affordances, and conflict-list rendering** inside the dialog itself, so a traveling vet has no doubt which timezone they're typing in and never sees a stray browser-tz date.

### Gaps to close

1. **Time inputs have no tz label.** Vet in Italy editing an LA shift sees "08:00" with no indication it means LA-local.
2. **Switching facility silently re-anchors the wall-clock to the new clinic's tz** with no notice. If they typed 8 AM for LA then pick NY, it now means 8 AM NY.
3. **Default start time on calendar-slot clicks** (`defaultStartTime`) is computed in browser tz upstream — wrong when traveling.
4. **Conflict pills inside the dialog** (3 spots: ~lines 866, 1172, 1264) use `format(new Date(c.start_datetime), 'MMM d, h:mm a')` — render in browser tz, can show wrong day.
5. **Default date for new shift** (`defaultDate`) is a JS `Date` built upstream from browser-local day — same dateline risk.

### Changes

**A. Tz label + helper text on time fields** (`ShiftFormDialog.tsx`)
- Show "Clinic time · America/Los_Angeles (PDT)" next to start/end inputs. Use `Intl.DateTimeFormat(...).formatToParts` to get the short tz name for the selected date.
- If the user's profile tz ≠ clinic tz, add a one-line subtle note: "You're in Europe/Rome — these times are saved as clinic-local."

**B. Facility-switch tz reconciliation**
- When `facilityId` changes and the dialog isn't editing an existing shift's original facility, keep the wall-clock as typed but show an inline notice: "Times now interpreted as <new tz>." No silent conversion (matches current behavior, just makes it visible).
- When editing an `existing` shift and the user changes facility, offer a single toggle: *Keep wall-clock time* (default) vs *Keep absolute instant* (re-derive HH:mm in new tz from existing UTC). Default to keep wall-clock to match today's behavior.

**C. Tz-aware defaults from calendar**
- In `SchedulePage` callers that open the dialog with `defaultDate`/`defaultStartTime`, derive both from the **clicked day's clinic-local context**:
  - For day/week grid clicks, the slot already knows its date + hour in clinic tz — pass `defaultDateYMD: string` (YYYY-MM-DD) and `defaultStartTime: 'HH:mm'` instead of a `Date`.
  - Update `ShiftFormDialog` props: add `defaultDateYMD?: string`; keep `defaultDate` as a deprecated fallback. Initialize `selectedDates` via `ymdToLocalDate(defaultDateYMD)` first.
- For "+ Add shift" from dashboard / global, default date = today in **selected facility's tz** via `formatYMDInTz(new Date(), tz)`; default start time blank (current behavior).

**D. Fix conflict-pill rendering inside the dialog**
- Replace the 3 occurrences of `format(new Date(c.start_datetime), …)` with `formatDateInTz(c.start_datetime, conflictFacilityTz, 'MMM d, h:mm a')` where `conflictFacilityTz = facilities.find(f => f.id === c.facility_id)?.timezone ?? BROWSER_TZ`.

**E. Tests** (`src/test/shiftFormTz.test.ts`)
- Render dialog with `TZ=Europe/Rome`, facility tz `America/Los_Angeles`, fill date 2026-05-27, time 08:00, submit → assert `start_datetime === '2026-05-27T15:00:00.000Z'` (PDT).
- Edit existing shift stored as `2026-05-27T15:00Z`, dialog displays `08:00` and date `May 27` regardless of `TZ`.
- DST: 2026-03-08 02:30 LA → assert documented behavior (resolves to 03:30 PDT) and round-trip is stable.
- Switching facility from LA to NY: wall-clock stays `08:00`, saved instant changes to `2026-05-27T12:00Z`.
- Conflict pill renders the conflicting shift's date/time in **its** facility tz, not browser tz.

### Out of scope

- Changing the "wall-clock vs absolute instant" default on facility switch (keeping today's behavior).
- Backfilling historic shifts.
- Other surfaces (dashboard, list view, time-grid) — already fixed in the prior phase.

### Files touched

- `src/components/schedule/ShiftFormDialog.tsx` — tz labels, facility-switch notice, conflict-pill formatting, accept `defaultDateYMD`.
- `src/pages/SchedulePage.tsx` — pass `defaultDateYMD` + clinic-tz `defaultStartTime` to the dialog.
- `src/components/schedule/WeekTimeGrid.tsx` (or wherever slot clicks originate) — emit clinic-tz YMD/HHmm.
- `src/test/shiftFormTz.test.ts` — new.

No DB migration. No business-logic changes outside the form.