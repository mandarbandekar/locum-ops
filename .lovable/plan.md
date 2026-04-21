

## Goal
In the **Block Time** dialog, highlight dates that already have a shift in light-red on both the Start Date and End Date calendars, so users can see when they're already booked before blocking time off. Today these calendars give no indication of existing shifts.

## Changes

### `src/components/schedule/BlockTimeDialog.tsx`
- Pull existing shifts from the data context: `const { shifts } = useData()`.
- Compute `bookedDateObjects: Date[]` via `useMemo` — one `Date` per unique calendar day that has a shift (use local-day key `YYYY-M-D` to dedupe and avoid timezone drift, matching the pattern already used in `ShiftFormDialog`).
- Pass `modifiers={{ booked: bookedDateObjects }}` and `modifiersClassNames={{ booked: "bg-red-100 text-red-700 font-semibold hover:bg-red-200 dark:bg-red-950/40 dark:text-red-300 dark:hover:bg-red-900/50 aria-selected:!bg-primary aria-selected:!text-primary-foreground" }}` to **both** the Start Date and End Date `<Calendar>` components inside the popovers.
- Add a tiny inline legend directly under the Start/End Date row (only when `bookedDateObjects.length > 0`):
  - Red dot swatch + caption: `Has a scheduled shift`.
  - Small muted helper text so users understand the cue applies to both date pickers.

## What this does NOT change
- Block-time save/delete logic, validation, or date constraints (End Date still disabled before Start Date).
- Booked dates remain selectable — users can still block time on a day that has a shift; the cue is informational.
- No changes to `ShiftFormDialog`, the schedule grid, or any DB/API.

## Files touched
- `src/components/schedule/BlockTimeDialog.tsx`

