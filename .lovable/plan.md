## Goal

On the Schedule page toolbar (calendar views), the stats strip showing `shifts · hours · $total` has two issues:

1. Hours render as a raw decimal (e.g. `143.58333333334 h`) instead of a clean `HH:MM` format.
2. The strip is right-aligned next to the Layers button. It should sit visually centered within the calendar's toolbar row, while still collapsing cleanly on mobile.

## Changes (UI only — `src/pages/SchedulePage.tsx`)

### 1. Format hours as HH:MM

- Use the existing `formatHoursMinutes(minutes)` helper from `src/lib/shiftBreak.ts` (already returns `H:MM`, e.g. `143:35`).
- Replace the running decimal-hours sum with a running **minutes** sum, then format once for display:
  - `totalMinutesInRange = activeRangeShifts.reduce((sum, s) => sum + getBillableMinutes(s), 0)`
  - Display: `{formatHoursMinutes(totalMinutesInRange)} h`
- Update the list-view footer cell (line 579) to use the same formatted value instead of `{totalHoursInRange}h`.

### 2. Center the stats strip in the toolbar

Restructure the row at lines 392–412 into a 3-column flex layout so the stats are visually centered between the date-nav (left) and Layers (right):

```text
[ ‹ Date › Today ]      [ 19 shifts · 143:35 h · $29,880 ]      [ Layers ]
```

- Wrap the row in a `flex items-center` container with three children:
  - Left group: date nav + Today button (`flex-1` and `justify-start`)
  - Center group: stats strip (`flex-1` and `justify-center`, hidden on small screens via `hidden md:flex`)
  - Right group: Layers popover (`flex-1` and `justify-end`)
- This keeps each side balanced so the center group truly sits in the middle of the toolbar regardless of date-label width.

### 3. Mobile behavior (preserve current)

- Stats strip stays `hidden md:flex` so it doesn't crowd small screens.
- On mobile the layout collapses back to: date nav on the left, Layers on the right (center column is empty/0-width since hidden).
- No changes to the mobile FAB / action buttons elsewhere.

## Out of scope

- No changes to totals math beyond switching the hours unit from decimal hours to minutes for formatting.
- No changes to list view or other pages.
- No changes to design tokens.
