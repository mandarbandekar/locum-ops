## Shift Break Handling — Surgical Addendum

Adds a clean separation between **scheduled time** (calendar) and **billable time** (invoices, analytics) via a clinic-level break policy and per-shift override.

---

### 1. Database changes (migration)

**`facilities` table**
- Add `default_break_minutes integer NULL` — `null` = paid (no deduction); `0` = no break; `>0` = unpaid minutes.

**`shifts` table**
- Add `break_minutes integer NULL` — same semantics; defaults to clinic value at insert time.
- Add `worked_through_break boolean NOT NULL DEFAULT false` — when true, billable = scheduled.

No backfill. Existing clinics/shifts stay `null` so all existing invoices and metrics calculate exactly as today.

---

### 2. Shared helper

New file `src/lib/shiftBreak.ts`:
- `getScheduledMinutes(shift)`
- `getBillableMinutes(shift)` — implements the spec rules (worked_through_break wins; null/0 break = no deduction)
- `formatBillableHours(min)` — decimal with one place (e.g. `7.3`)
- `getClinicBreakLabel(min)` — `"Paid (no deduction)"`, `"Unpaid 30 min"`, `"Unpaid 60 min"`, `"Custom (N min)"`

### 3. Type updates

- `src/types/index.ts`: extend `Facility` with `default_break_minutes`, extend `Shift` with `break_minutes` and `worked_through_break`.
- `src/contexts/DataContext.tsx`: read/write the new columns; default new shifts' `break_minutes` from the parent facility's `default_break_minutes`.

### 4. Calculation wiring (use helper everywhere)

- `src/lib/invoiceAutoGeneration.ts` — hourly line items use `getBillableMinutes` for `qty` (flat/half-day rates unchanged).
- `src/lib/shiftInvoiceSync.ts` — hourly resync uses billable minutes.
- `src/lib/businessLogic.ts` and analytics (dashboard hours-worked, `IncomeBySource`, `PerformanceInsightsTab`, `ReportsPage`) — hours metrics use billable minutes for **all** rate types.
- `src/lib/icsGenerator.ts` calendar tooltip — show `"X billable hours"` subtitle.

Overtime is explicitly out of scope.

### 5. Clinic create/edit UI (`AddClinicStepper.tsx`)

New "Break policy" section directly under the rates section, on the same step as rates:
- Segmented control: `Paid (no deduction)` | `Unpaid 30 min` | `Unpaid 60 min` | `Custom`
- Custom reveals number input "Unpaid break (minutes)" (min 1, max 240)
- Helper text: *"This is the default for new shifts at this clinic. You can override per shift."*
- Default for new clinics: **Paid**.

### 6. Add/Edit Shift UI (`ShiftFormDialog.tsx`)

New "Shift break" section between time pickers and rate section:
- Inherited badge: `From clinic: <policy text>` (small light-teal pill)
- Same 4-option segmented control, pre-filled from clinic default (or from shift value when editing)
- Live helper line:
  - With break: `Billable: 9.5 hours · 10:00 scheduled − 0:30 break`
  - No break: `Billable: 10 hours`
  - Worked through: `Billable: 10 hours · worked through break`
- Toggle: **Worked through break** with subtitle *"Override for this shift only"*. When ON, helper collapses and `break_minutes` is ignored.
- Editing legacy shifts (`break_minutes = null`): show "Paid (no deduction)" selected.
- "NEW" pill on the section title (release date stored as constant; auto-hides 30 days later).

### 7. Display updates

- Shift detail / invoice line item / hours-worked totals: show billable hours.
- Where a deduction applies (`break_minutes > 0` and not worked through), append parenthetical `9.5 hrs (incl. 30 min unpaid break)` — **only on detail/invoice line views**, not on calendar grid chips or compact lists (`CalendarEventChip`, `WeekTimeGrid`, `UpcomingShiftsCard` stay compact).

### 8. Visual

Monterey Bay palette as specced: active segment teal `#1A5C6B`/`#E1ECEF`, inactive warm gray `#D8D2C4`, helper line bg `#F1EDE3`, "NEW" pill light teal. Plus Jakarta Sans (already global).

### 9. Copy

All exact strings from the spec glossary, used verbatim.

---

### What we're NOT touching

- Existing rate-type logic (hourly/flat/half-day pricing rules)
- Invoice send/email flow
- Clinic CRM beyond the one new field
- Overtime
- Existing shifts and existing invoices (no backfill, null = paid = today's behavior)

### Files to add / change

- **Add**: `src/lib/shiftBreak.ts`
- **DB migration**: 2 columns on `facilities`, 2 columns on `shifts`
- **Edit**: `src/types/index.ts`, `src/contexts/DataContext.tsx`, `src/lib/invoiceAutoGeneration.ts`, `src/lib/shiftInvoiceSync.ts`, `src/lib/businessLogic.ts`, `src/lib/icsGenerator.ts`, `src/components/facilities/AddClinicStepper.tsx`, `src/components/facilities/RatesEditor.tsx` (insertion point), `src/components/schedule/ShiftFormDialog.tsx`, `src/pages/InvoiceDetailPage.tsx`, dashboard/analytics components that show hours.
