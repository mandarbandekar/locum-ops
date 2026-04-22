

## Block Time: Range Selection + Shift Conflict Warning

Two improvements to `BlockTimeDialog`:

### 1. Drag-to-select date range

Replace the two separate single-date pickers (Start Date / End Date) with a **single range calendar** so the user clicks a start date and drags (or clicks an end date) to fill the range automatically.

- Use shadcn `Calendar` in `mode="range"` instead of two `mode="single"` popovers.
- One trigger button labeled with the selected range, e.g. `Mar 10 – Mar 14, 2026` (or `Pick a date range` when empty).
- `selected={{ from: startDate, to: endDate }}` → on change, set both `startDate` and `endDate` from the returned range. If the user only clicks one day, `to` falls back to `from` so a single-day block still works.
- Keep all-day toggle and time inputs unchanged. Times still apply to the chosen `from` / `to` dates.
- Keep the existing red "booked" highlight (`modifiers={{ booked: bookedDateObjects }}`) so shift days remain visually flagged in the picker itself.

### 2. Conflict warning when block overlaps a scheduled shift

Add a real-time conflict check inside the dialog (mirrors how `ShiftFormDialog` warns on double-booking):

- Compute `conflictingShifts` via `useMemo` over `shifts` from `useData()`. A shift conflicts if its start/end interval overlaps the block's effective interval (respecting all-day vs timed).
- When `conflictingShifts.length > 0`, render an inline `Alert` (amber/warning variant, matching the app's status-pill system) directly under the date range picker:
  - Title: `Heads up — this overlaps a scheduled shift`
  - Body lists each conflicting shift: facility name + date + time range (e.g., `Greenfield Medical Center · Mar 12, 8:00 AM – 6:00 PM`).
  - Helper line: `You can still save this block — shifts won't be removed. Edit or delete the shift first if this was a mistake.`
- Pass `facilities` (or a `getFacilityName` helper) into the dialog from `SchedulePage` so the alert can show readable names. `useData()` already exposes facilities, so we can pull them in directly inside `BlockTimeDialog` instead of plumbing props.
- Saving is **not blocked** — the warning is informational, consistent with the existing shift-conflict behavior. The Save button stays enabled.

### Files to change

- `src/components/schedule/BlockTimeDialog.tsx` — swap dual single-date pickers for one range picker, add conflict memo + Alert, pull facilities from `useData()` for names.

No changes to `SchedulePage`, `WeekTimeGrid`, the time_blocks schema, or shift logic.

### Out of scope

- No drag-to-select directly on the month grid (only inside the dialog's calendar).
- No automatic block/shift resolution — purely an informational warning.
- No changes to all-day toggle, color picker, type picker, notes, or delete flow.

