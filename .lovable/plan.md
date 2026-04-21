

## Bug: Shift dialog state persists across opens

### Root cause
`ShiftFormDialog` lives permanently mounted in `SchedulePage` (and similar pages) — only its `open` prop toggles. React state initializers only run once on mount, so every field (`selectedDates`, `facilityId`, `startTime`, `endTime`, `rate`, `notes`, `color`, `step`, custom-rate flags) keeps its previous value the next time the dialog opens.

That's why your screenshot shows 10 dates pre-selected from a prior session and conflict warnings against a clinic you weren't even editing — the calendar still held the previous facility's selections, and the conflict detector (correctly) flags time overlaps with shifts at *any* clinic on the same day.

### Fix
Add a single `useEffect` in `ShiftFormDialog` that runs whenever `open` transitions to `true` for a **new shift** (i.e., `existing` is undefined). It resets every form field back to the same defaults the `useState` initializers use today:

- `facilityId` → `existing?.facility_id` || first facility id || `''`
- `selectedDates` → `defaultDate ? [defaultDate] : []`
- `startTime` / `endTime` → `defaultStartTime`-derived defaults or `'08:00'` / `'18:00'`
- `rate` → `''`, `selectedRateKey` → `''`, `isCustomRate` → `false`, `customRateLabel` → `''`, `saveCustomRate` → `true`
- `notes` → `''`, `showNotes` → `false`
- `color` → `'blue'`
- `step` → `1` (already handled — fold the existing effect into the new one)
- `isSubmitting` → `false`

For edit mode (`existing` is defined), reset to the values derived from `existing` so reopening the editor on a different shift shows that shift's data — `FacilityDetailPage` already passes `key={editShift.id}` for this; `SchedulePage` doesn't, so add `key={editShift.id}` there too as a belt-and-suspenders safeguard.

### Files touched
- `src/components/schedule/ShiftFormDialog.tsx` — replace the small "reset step" effect with a comprehensive reset-on-open effect covering all form state.
- `src/pages/SchedulePage.tsx` — add `key={editShift.id}` to the edit-mode `<ShiftFormDialog>` for parity with `FacilityDetailPage`.

### What this does NOT change
- Conflict detection logic stays as-is (it's correct: you can't be at two clinics simultaneously). Once stale dates are gone, real conflicts will only show when they're real.
- No DB changes, no API changes.

