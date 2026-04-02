

# Schedule Module UX Evaluation and Improvements

## Current State Assessment

The Schedule module has five tabs (Month, Week, List, Clinic Confirm, Sync), a date navigator, calendar layer filters, drag-and-drop rescheduling, and a multi-date ShiftFormDialog. Here's what needs improvement:

### Issues Identified

1. **No context when the calendar is empty** — New users land on a blank month grid with no guidance. There's no empty state encouraging them to add their first shift. This is the #1 adoption blocker since shifts drive revenue and invoices.

2. **No shift summary strip** — Users can't see at a glance how many shifts, hours, or expected revenue they have for the current period without counting pills manually.

3. **"Add Shift" button competes with view toggles** — The primary CTA sits inline with 5 view toggle buttons, making it easy to miss. On mobile the button row wraps awkwardly.

4. **No "Today" indicator in month view header** — There's a small "Today" button but the current day cell only gets a faint `bg-primary/5` tint that's easy to miss.

5. **List view lacks earnings column** — The list table shows Rate but not total earnings (rate × hours), which is the number users actually care about.

6. **No weekly/monthly summary in list view** — The list is just a flat table with no totals row showing aggregate hours and earnings.

---

## Recommended Plan

### Change 1: Add an empty state when no shifts exist for the visible period
When `rangeShifts.length === 0` and the user is on month/week view, show a centered empty state card with an illustration prompt and "Add Your First Shift" CTA that opens the shift dialog. This directly drives adoption.

**In `src/pages/SchedulePage.tsx`:**
- Add an empty state component above/overlaying the calendar when no shifts exist in the range
- Include a brief value proposition: "Add shifts to track your schedule, auto-generate invoices, and sync to your calendar"

### Change 2: Add a Schedule Summary Strip below the navigation
A compact row showing key stats for the visible period: **X shifts · Y hours · $Z expected revenue**. Gives instant context without reading the calendar.

**In `src/pages/SchedulePage.tsx`:**
- Compute `totalShifts`, `totalHours`, `totalRevenue` from `rangeShifts` (non-canceled)
- Render a small strip between the date nav and the calendar grid
- Only show when there are shifts in range

### Change 3: Elevate the "Add Shift" button
Move "Add Shift" out of the view toggle row. Place it as a floating action or prominently separated primary button so it's always visible and clearly the main action.

**In `src/pages/SchedulePage.tsx`:**
- Move "Add Shift" to the page header row next to the title, separated from view toggles
- Keep it as the primary variant button

### Change 4: Add earnings column and totals row to List view
Add an "Earnings" column computed as `rate × hours` and a summary footer row with totals.

**In `src/pages/SchedulePage.tsx`:**
- Add "Earnings" column: `rate_applied * (duration in hours)`
- Add a `<tfoot>` with total shifts, total hours, total earnings

### Change 5: Strengthen today indicator in month view
Make today's date number more prominent with a filled circle background (already partially done) and add a subtle left-border accent to the cell.

**In `src/pages/SchedulePage.tsx`:**
- Add `border-l-2 border-l-primary` to today's cell in `renderDayCell`

---

## Files to modify

### `src/pages/SchedulePage.tsx`
- Add schedule summary strip (shifts/hours/revenue) below date nav
- Add empty state overlay when no shifts in range
- Move "Add Shift" button to header row, separate from view toggles
- Add earnings column + totals footer to list view
- Strengthen today cell styling

### No new files, no database changes, no backend changes. All presentation-layer.

## Technical Detail

- Hours computed via `differenceInHours(end, start)` from date-fns (already imported)
- Revenue = `shift.rate_applied` (this is already the total for the shift, not hourly — confirmed from the data model where `rate_applied` is per-shift)
- Summary strip uses the existing `rangeShifts` filtered array
- Empty state only shows when `rangeShifts.length === 0` and view is month/week/list (not confirmations/sync)

