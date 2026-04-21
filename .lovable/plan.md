

## Bug: Add Shift calendar always opens on today's month

When you've navigated the schedule to (say) February but tap **Add Shift** from the header, the dialog's calendar opens on the current real-world month instead of February. You then have to page back to find your dates.

## Root cause
`SchedulePage` tracks the viewed month in `currentDate`, but it doesn't pass that to `ShiftFormDialog`. The dialog's `<Calendar mode="multiple">` falls back to react-day-picker's default, which is today.

## Fix

### `src/components/schedule/ShiftFormDialog.tsx`
- Add an optional `defaultMonth?: Date` prop.
- Pass `defaultMonth={defaultMonth ?? selectedDates[0] ?? defaultDate ?? new Date()}` to both `<Calendar>` instances (the multi-date calendar in step 2 and the single-date popover calendar in edit mode).

### `src/pages/SchedulePage.tsx`
- Pass `defaultMonth={currentDate}` to the Add Shift `<ShiftFormDialog>` (the one bound to `showAdd`). Edit-mode dialog can keep its existing behavior since it centers on the shift's date.

## What this does NOT change
- Day-cell click behavior (still passes `defaultDate` for that specific day).
- Selected dates / form state reset behavior from the recent fix.
- No DB or API changes.

## Files touched
- `src/components/schedule/ShiftFormDialog.tsx`
- `src/pages/SchedulePage.tsx`

