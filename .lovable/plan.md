

## Goal
On the Add Shift calendar, render dates that already have a shift in a clearly **light-red** (caution) style so the user sees at a glance which dates are taken before tapping. Today they render with `bg-destructive/20 text-destructive`, which on the sage/gold theme can look muted; the cue is also undocumented to the user.

## Changes

### `src/components/schedule/ShiftFormDialog.tsx` — Step 2 calendar
- Update the `booked` modifier styling on the multi-date `<Calendar>`:
  - Replace `"bg-destructive/20 text-destructive font-semibold"` with a light-red token combo: `"bg-red-100 text-red-700 font-semibold hover:bg-red-200 dark:bg-red-950/40 dark:text-red-300 dark:hover:bg-red-900/50"`.
  - When a booked date is also selected (user chose to double-up despite caution), keep the primary selection ring visible — react-day-picker stacks classNames, but to ensure the selected styling wins visually, add `aria-selected:bg-primary aria-selected:text-primary-foreground` to the booked classes.
- Add a small inline legend directly under the calendar (next to the existing "Tap dates to select" / selected-count line) so the color has meaning:
  - A red dot swatch + caption: `Already has a shift`.
  - Only render when `bookedDateObjects.length > 0`.
- No change to behavior — booked dates remain selectable (matches existing conflict-warning flow). The existing red conflict banner under the time row still appears if the user picks one and times overlap.

## What this does NOT change
- Conflict detection logic, banner, or save flow.
- Edit-mode single-date popover calendar (no booked highlighting there — editing one shift).
- Month/week schedule grid styling.
- No DB, API, or prop changes.

## Files touched
- `src/components/schedule/ShiftFormDialog.tsx`

