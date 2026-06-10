# Mobile Schedule — Calendar View

Replace the current month-grouped list on the mobile `/schedule` page with a tappable monthly calendar grid. Days containing shifts/events are highlighted by status. Tapping a date reveals that day's shifts beneath the calendar; tap a shift card to edit.

## Layout (top → bottom)

1. **Header** — "Schedule" (unchanged).
2. **Status legend** — horizontal row: Confirmed, Completed, Event, Expired. Each = small color dot + label.
3. **Month navigator** — ‹ Month YYYY › (kept).
4. **Calendar grid** — Sunday-start 7-column grid, 6 weeks. Each cell:
   - Day number; out-of-month days dimmed.
   - Days with shifts/events render the number inside a filled colored circle (Confirmed = primary, Completed = muted gray, Event = teal, Expired = rose).
   - Today's number is underlined when not otherwise filled.
   - Selected day gets a focus ring.
5. **Selected-day panel** — full date label (e.g. "Sat, Jun 13, 2026") on a subtle bar, then shift cards for that day: facility name, time range (clinic tz), total $ amount, invoice status pill, edit pencil → opens existing `ShiftFormDialog`. Empty state with "Add shift" when none.
6. **FAB** — "Add shift" (kept).

Default selected day = today; switching months auto-selects the first day-with-shift in the new month, else the 1st.

## Status mapping

Per data model (no shift statuses; all shifts are active):
- **Confirmed** — shift on a future date.
- **Completed** — shift on a past date.
- **Event** — credential renewal / subscription renewal from `useCalendarEvents` that's active or due_soon.
- **Expired** — credential/subscription event with status `expired`.

Priority when a day has multiple: Expired > Confirmed > Event > Completed.

## Files

- **Edit** `src/pages/mobile/MobileSchedulePage.tsx` — replace the grouped list with: legend strip, calendar grid, selected-day panel. Keep month nav, FAB, dialogs, and data hooks. Pull in `useCalendarEvents` for Event/Expired markers. All date bucketing via `formatDateInTz(..., 'yyyy-MM-dd')` (clinic tz, no UTC drift).
- No new files; no schema or business-logic changes; desktop `/schedule` untouched.