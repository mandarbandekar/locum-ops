# Timezone Audit — Traveling Relief Vet

## Expected vs. actual

**Expectation 1 — Adding shifts in clinic timezone, not device timezone**
Status: **Mostly correct.** Every primary shift creation path now interprets the picked time in the clinic's tz via `zonedWallClockToUtc(date, time, clinicTz)`:
- `src/components/schedule/ShiftFormDialog.tsx` (`buildStartEndIso`, line 376) ✅
- `src/components/onboarding/OnboardingShiftBuilder.tsx` (line 95) ✅
- `src/components/onboarding/OnboardingShiftStep.tsx` (line 74) ✅
- `src/hooks/useManualSetup.ts` ✅ (verified earlier)
- Drag-to-reschedule in `SchedulePage.tsx` (`handleDropOnDay` line 188, `handleDropOnTime` line 214) ✅

**Expectation 2 — Calendar dates render as the clinic would see them**
Status: **Partially correct.** The week/day time grid is fully clinic-tz aware (`WeekTimeGrid.tsx` uses `isSameDayInTz` / `getHoursInTz` / `formatTimeInTz` per-facility). But several other surfaces still bucket shifts using the **browser's** local date, which is what causes the "May 27 shift shows on May 26" class of bug when the user is east of the clinic.

## Remaining gaps

| # | File / surface | Bug | Symptom for traveling user |
|---|---|---|---|
| 1 | `SchedulePage.tsx` line 297 — month-view `renderDayCell`: `shifts.filter(s => isSameDayInTz(s.start_datetime, day, tzForFacility(...)))` | This one is OK ✅ |  |
| 2 | `SchedulePage.tsx` lines 154–157 — `rangeShifts` (drives counts, hours, revenue, list view) uses `new Date(s.start_datetime) >= rangeStart` where rangeStart is browser-local | Stat strip and "list" view can include/exclude a shift one day off | Monthly totals wrong by one shift around month edges |
| 3 | `SchedulePage.tsx` line 348 — list view chip uses `new Date(s.start_datetime)` for `differenceInHours` (only used for hours math; OK) and line 630 `format(new Date(s.start_datetime), 'EEE, MMM d')` renders in **browser tz** | List rows show wrong date label when traveling | Same shift labeled May 26 in list, May 27 on grid |
| 4 | `SchedulePage.tsx` lines 178–224 — drag handlers compute `format(targetDate, 'yyyy-MM-dd')` from a JS Date | If `targetDate` came from `weekDays` (built by date-fns in browser tz) this is fine, but the toast `format(newStart, 'EEE, MMM d')` shows browser-tz date | Drag works correctly, but confirmation toast may say wrong day |
| 5 | `SchedulePage.tsx` line 89 / 98 — YTD revenue and "future shifts" use `new Date(s.start_datetime).getFullYear()` and `>= new Date()` | Year boundary classification can be off for late-Dec / early-Jan shifts when traveling | Wrong YTD bucket near year-end |
| 6 | `components/dashboard/UpcomingShiftsCard.tsx` lines 47–48 — "next 7 days" filter uses raw `new Date(s.start_datetime)` | Time math is fine (it's an instant comparison) but the date shown to the user uses browser tz | Card may say "Wed May 27" while clinic-local is "Thu May 28" or vice versa |
| 7 | `components/dashboard/UpcomingShiftsStrip.tsx` — receives a JS `Date` already formatted upstream; need to confirm upstream uses clinic tz | Likely affected the same way as #6 | Same as #6 |
| 8 | `components/onboarding/OnboardingShiftStep.tsx` lines 107–108 — preview hours computed via `new Date(\`${shiftDate}T${startTime}\`)` (browser-local parse) | Save path is correct, only the **inline preview** of "X hours" is browser-tz | Negligible (hours, not date) but inconsistent |
| 9 | `WeekTimeGrid.tsx` `weekDays` array — built by date-fns from `currentDate` (browser tz). When user is in Italy and clinic is in PDT, "Wed" column header is the user's Wed, not the clinic's. Shift bucketing then uses `isSameDayInTz` against that Wed Date object | Mostly fine because we compare Y/M/D numerically, but the column itself represents the user's calendar week | A clinic shift that falls on Sunday PDT but Monday in Italy lands in the visible Sunday column only because we strip Y/M/D — works, but conceptually fragile across week boundaries when user crosses dateline |
| 10 | Time blocks (`SchedulePage.tsx` line 299, `WeekTimeGrid.tsx` blocks loop) use raw `new Date(b.start_datetime)` for day bucketing | Personal blocks render on browser-local day, not clinic-local | Block titled "Vacation May 27" can shift to May 26 |
| 11 | Reports / Invoices / Confirmations — not audited in this pass | Likely use `new Date(...)` for date labels too | TBD |

## Severity ranking

- **High** (visibly wrong dates the vet will notice): #3, #6/#7, #10
- **Medium** (off-by-one totals/badges around boundaries): #2, #5
- **Low** (cosmetic, math correct): #4, #8, #9

## Fix plan

### Phase 1 — Stop displaying browser-tz dates (high impact, no schema change)
1. `SchedulePage.tsx` list view (lines 630, 663): replace `format(new Date(s.start_datetime), 'EEE, MMM d')` with `formatYMDInTz(...) → parsed → format(...)` using `tzForFacility(s.facility_id)`. Add a small `formatDateInTz(iso, tz, pattern)` helper to `src/lib/tzTime.ts`.
2. `SchedulePage.tsx` drag toasts (lines 194, 197, 220, 223): format the date using `tz`.
3. `UpcomingShiftsCard.tsx` and the upstream of `UpcomingShiftsStrip.tsx`: when rendering the date chip, format in `tzForFacility(s.facility_id)`.
4. Time blocks (#10): time blocks have no facility tz; introduce a `timezone` field on the block (default to user profile tz), or compare using the user's profile tz consistently. Ship the simpler version first: use the user's profile tz for block buckets.

### Phase 2 — Range/aggregation correctness (medium)
5. `SchedulePage.tsx` `rangeShifts` (lines 154–157): bucket each shift by its clinic-local date (`formatYMDInTz`), then check inclusion in the visible range's Y/M/D window — not by raw instant comparison.
6. YTD/future filters (lines 89, 98): use clinic-local year via `formatYMDInTz(s.start_datetime, tz).slice(0,4)`.

### Phase 3 — Concept hardening (low / future)
7. Add a `formatDateInTz` and `getYMDInTz` helper and ban raw `new Date(s.start_datetime)` for **display** via an ESLint rule or a code review checklist. (Instant math like duration, sorting, "is in the past" is fine raw.)
8. Audit `Reports`, `InvoicesPage`, `Confirmations`, `CPAPrep` for the same pattern (separate ticket).

### Out of scope for this audit
- Multi-tz "home base" concept (vet has no clinic for a given date — not applicable; user said "timezone of clinic/home base for the day of the clinic", and every shift has a facility).
- Backfilling historic shifts already saved with bad anchors (handled separately for Praadnya; Kurtz still pending confirmation).

## Bottom line

Saving shifts (Expectation 1): ~95% there.
Reading shifts (Expectation 2): the **time grid** is correct, but **list view, dashboard "Coming Up", time blocks, and stat strips** still render in browser tz. A traveling vet today will see the calendar grid look right, but secondary surfaces (Coming Up card, list view, totals) will be off by one day. Phases 1+2 above close the gap.
