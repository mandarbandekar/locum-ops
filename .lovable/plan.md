## Goal

Add an end-to-end-style unit test that exercises an **overnight shift** (e.g. 22:00 → 06:00 next day) through the two surfaces it has to behave correctly on:

1. **Schedule calendar** — placement and rendering on the correct day(s)
2. **Invoice generation** — eligibility, line item, and total math when billed

Plus a short list of overnight-related edge cases worth covering that I noticed but aren't explicitly tested today.

## What's already covered

`src/test/overnightShifts.test.ts` already tests:
- `getScheduledMinutes` / `getBillableMinutes` for the 8h overnight case
- Legacy fallback when `end <= start` on same day
- Break deduction + `worked_through_break` override
- The write-path `rollEndForward` helper that the form / setup-assistant use

So duration math and the write-path are solid. What's **not** covered: calendar placement, and the auto-invoice pipeline for an overnight shift.

## New test file

`src/test/overnightShiftFlow.test.ts` — pure logic test (no React render, same style as `dashboardQuarterlyFlow.test.ts` and `invoiceDraftTotals.test.ts`).

### Scenario seeded
- Facility: monthly billing cadence, $80/hr rate
- Shift A: overnight 2026-05-31 22:00 → 2026-06-01 06:00 (8h, crosses month boundary)
- Shift B (control): same-day 2026-06-02 09:00 → 17:00 (8h)

### Calendar placement assertions
Mirrors `WeekTimeGrid`'s `isSameDay(new Date(s.start_datetime), day)` rule:
1. Overnight shift appears on the **start day** (2026-05-31), not the end day (2026-06-01).
2. A week view containing 2026-05-31 includes the overnight shift exactly once.
3. A week view containing only 2026-06-01 does **not** show the overnight shift (current product behavior — worth pinning so a future "split across days" change is intentional).
4. Day-level conflict detection on 2026-06-01 with a 07:00 shift does NOT flag the overnight shift as a conflict (since `detectShiftConflicts` keys off `dateKey` of the start).

### Invoice generation assertions
Using `getEligibleShiftsForPeriod` + `buildAutoInvoiceDraft` + `recalcDraftTotals`:
1. **Bucketing by start date**: an invoice for May 2026 (period 2026-05-01 → 2026-05-31) includes the overnight shift; June 2026 invoice does not.
2. **Line item math**: overnight line uses billable minutes (480 → 8h) × rate = $640; same-day line = $640; invoice total = $1,280; `balance_due` matches.
3. **No double-billing**: passing the overnight shift's id in `invoicedShiftIds` excludes it from the next eligibility query.
4. **Break deduction flows through**: a 30-min unpaid break on the overnight shift drops its line to 7.5h × $80 = $600 and recomputes the invoice total.

## What else I'd suggest adding (not in this PR, listed for your call)

These are gaps I noticed while wiring this up — happy to add any/all in a follow-up:

| Gap | Why it matters |
|---|---|
| **iCal export of overnight shifts** (`src/lib/icsGenerator.ts`) — assert `DTEND` is the rolled-forward timestamp, not same-day | Calendar-sync subscribers (Google/Apple) silently drop or misrender 0-length events |
| **Dashboard "Upcoming Shifts" card** with an overnight shift starting tonight | Confirms it's still considered "today" not "tomorrow" |
| **Dashboard earnings by quarter** for a shift whose `end_datetime` crosses Q1→Q2 | `sumShiftEarningsInRange` uses `end_datetime`; an overnight shift on Mar 31 → Apr 1 currently lands in Q2, which may surprise users |
| **Mileage backfill / auto-mileage** for overnight shifts | The end-of-shift trigger fires on the next calendar day — worth pinning |
| **Confirmations checklist month bucketing** for overnight shifts on the last day of the month | Same boundary issue |
| **Tax withholding nudge** uses shift `end_datetime` for "earned this quarter" — same Q1→Q2 edge as above |
| **DST transition overnight** (e.g. shift on Nov 1 2026 spanning the fall-back) | Currently `getScheduledMinutes` uses ISO ms diff so 8h becomes 9h on fall-back, 7h on spring-forward — may or may not be intended |

## Technical notes

- Test uses `vi.useFakeTimers` + `setSystemTime` so "now" is deterministic for the eligibility window.
- No DB / Supabase calls — all helpers used (`getEligibleShiftsForPeriod`, `buildAutoInvoiceDraft`, `recalcDraftTotals`, `detectShiftConflicts`, `getBillableMinutes`) are pure functions already exported.
- For the calendar-week assertion we replicate the one-line filter `shifts.filter(s => isSameDay(new Date(s.start_datetime), day))` from `WeekTimeGrid` so the test fails loudly if that rule ever changes.
- Run with `bunx vitest run src/test/overnightShiftFlow.test.ts`.
