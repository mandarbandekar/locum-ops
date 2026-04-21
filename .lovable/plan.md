

## Bug: Clicked date cell isn't pre-selected in Add Shift dialog

When you click a specific day cell on the month calendar to add a shift, the dialog opens but that date isn't pre-selected — you have to click it again inside the dialog's calendar.

## Root cause
`SchedulePage` opens the shift dialog on cell click but only passes `defaultMonth` (or nothing useful for `defaultDate`). The dialog's reset effect initializes `selectedDates` from `defaultDate ? [defaultDate] : []`, so when `defaultDate` is missing the multi-date calendar starts empty.

## Fix

### `src/pages/SchedulePage.tsx`
- Track the clicked cell date in a new state (e.g. `addShiftDate: Date | undefined`).
- In the month/week/day cell click handlers that currently open the Add Shift dialog, set `addShiftDate` to the clicked date before opening.
- Pass `defaultDate={addShiftDate}` to the Add Shift `<ShiftFormDialog>` (alongside the existing `defaultMonth`).
- Clear `addShiftDate` when the dialog closes so the next header-triggered "Add Shift" opens clean.

### `src/components/schedule/ShiftFormDialog.tsx`
- No structural change needed — the existing reset-on-open effect already seeds `selectedDates` from `defaultDate`. Verify it runs when `defaultDate` changes between opens (add `defaultDate` to the effect's dependency array if missing).

## What this does NOT change
- Header "Add Shift" button still opens with no preselected date (just the viewed month).
- Edit mode behavior unchanged.
- Conflict detection, rates, form reset logic all unchanged.
- No DB or API changes.

## Files touched
- `src/pages/SchedulePage.tsx`
- `src/components/schedule/ShiftFormDialog.tsx` (dependency-array tweak only, if needed)

