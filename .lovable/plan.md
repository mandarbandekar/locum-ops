## Finish Shift Break Handling — Remaining UI

Wraps up the surgical addendum. The DB columns, helper (`shiftBreak.ts`), invoice math, and clinic creation UI are done. This plan finishes the user-facing pieces so break minutes actually flow through the app end-to-end.

### 1. `ShiftFormDialog.tsx` — add the "Shift break" section + save payload

In **both** the guided new-shift flow (Step 3, Rate & details) and the flat edit form, insert a new "Shift break" section between Time and Rate:

- Inherited badge (light teal pill): `From clinic: <getBreakPolicyLabel(clinicDefault)>`
- `<BreakPolicySelector>` pre-filled from `breakMinutes` state (already wired)
- Live helper line below the selector:
  - `worked_through_break = true` → `Billable: X hours · worked through break`
  - `break_minutes > 0` → `Billable: X hours · HH:MM scheduled − H:MM break`
  - else → `Billable: X hours`
  - Helper line bg: `#F1EDE3` (light), themed for dark
- "Worked through break" `<Switch>` with subtitle *"Override for this shift only"* — when ON, dims the segmented control and forces helper to "worked through" copy.
- Add `break_minutes` and `worked_through_break` to **both** save payloads (existing edit branch + new multi-date branch in `handleSubmit`). Hourly `rate_applied` is recomputed from billable minutes when `activeRateKind === 'hourly'`.

### 2. `FacilityDetailPage.tsx` — Break policy editor card

Add a new compact `BreakPolicyCard` on the Overview tab (right column, above Upcoming Shifts; or under Rates editor in left column). It shows the current policy, allows edit via `BreakPolicySelector`, and saves with `updateFacility({ ...facility, default_break_minutes })`. Only shown when `engagement_type !== 'w2'`.

### 3. `DataContext.tsx` — pass through new columns

Confirm `addFacility` / `updateFacility` payloads include `default_break_minutes`, and `addShift` / `updateShift` include `break_minutes` and `worked_through_break`. The current spread already covers them since the `Shift`/`Facility` types now include the fields, but verify nothing strips them. (No code change expected unless `stripDbFields` or insert column lists exclude them.)

### 4. Display billable-hours labels

Add `"X hrs (incl. N min unpaid break)"` parenthetical only on **detail / invoice line** views, NOT on calendar chips or compact lists:

- **`src/components/invoice/InvoicePreview.tsx`** and **`InvoiceEditPanel.tsx`** line-item rows: when the linked shift has `hasUnpaidBreakDeduction`, append the parenthetical to the description / hours column.
- **Shift detail summary in `ShiftFormDialog` review step (Step 4)**: under the Time row, when applicable, render `formatBillableHours(...) hrs (incl. N min unpaid break)`.
- Leave `CalendarEventChip`, `WeekTimeGrid`, `UpcomingShiftsCard` untouched.

### 5. Visual polish

- "NEW" pill on the "Shift break" section title and on the "Break policy" section in the clinic stepper, controlled by a `BREAK_FEATURE_RELEASE_DATE` constant in `shiftBreak.ts`. Auto-hides 30 days after release.
- Use Monterey Bay tokens already established in `BreakPolicySelector`.

### Files to change

- `src/components/schedule/ShiftFormDialog.tsx` (break section in Step 3 + edit form, save payload)
- `src/pages/FacilityDetailPage.tsx` (break policy card on Overview)
- `src/components/invoice/InvoicePreview.tsx` and `InvoiceEditPanel.tsx` (billable parenthetical)
- `src/lib/shiftBreak.ts` (add `BREAK_FEATURE_RELEASE_DATE`, `isBreakFeatureNew()`)

### Out of scope

- Backfilling existing shifts (legacy null → paid, by design).
- Changing flat-rate or half-day pricing rules.
- Calendar grid / weekly time grid hour labels (stay compact).
