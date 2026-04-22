

## Edit invoice → keep shift in sync (and make OT a first-class line type)

Right now the invoice editor lets you add/edit/delete line items, but two things are missing for the workflow you described:

1. **Adding overtime is awkward** — there's no "Add overtime" action. Users have to add a generic "custom line" and manually type the description, qty, and rate.
2. **Shifts and invoice line items drift apart** — if a user edits an hourly invoice line (e.g. bumps qty from 8h → 10h), the underlying `shift` row keeps `end_datetime = +8h`. Next time the schedule recalculates totals, regenerates a draft, or shows the shift card, it disagrees with the invoice.

The fix is to (a) add a one-click "Add overtime" affordance scoped to hourly shift lines, and (b) two-way sync hourly line edits back to the shift's `end_datetime` and OT fields.

---

### Part 1 — "Add overtime" on hourly shift lines

In `src/components/invoice/InvoiceEditPanel.tsx`, the line-items section currently shows `ShiftLineItemCard` (linked to a shift) and custom lines, with one footer button: **"Add custom line"**.

**Change:** When the invoice contains at least one hourly shift line (`line_kind === 'regular'` and `shift_id` set) that does *not* already have a sibling overtime line, show a second button on that shift's card: **"+ Add overtime"**.

Clicking it:
- Looks up the shift's `overtime_config` from the facility's `terms_snapshots` (same lookup `ShiftFormDialog` does today via the rate's `overtime` policy). If the facility has an OT rate configured for the matched rate type, pre-fill `unit_rate = ot_rate`. Otherwise pre-fill to `1.5 × hourly_rate` as a sensible default.
- Inserts a new line item with `line_kind = 'overtime'`, `shift_id = <same shift>`, `service_date = <shift date>`, `description = "{Facility} — Overtime ({date})"`, `qty = 0` (user fills hours), `unit_rate = <pre-filled>`.
- Focuses the qty field so the user just types the OT hours.

Keeps "Add custom line" for genuinely non-shift items (mileage reimbursement, supplies, etc.) — unchanged.

### Part 2 — Bi-directional sync between hourly line items and shifts

When a user edits a `line_kind === 'regular'` or `line_kind === 'overtime'` line that has a `shift_id`, mirror the change back to the `shifts` row:

| Line edit                        | Shift update                                                                 |
|----------------------------------|------------------------------------------------------------------------------|
| Change `qty` on regular line     | Recompute `regular_hours = qty`, `end_datetime = start_datetime + qty hours` (preserves OT hours) |
| Change `qty` on overtime line    | Recompute `overtime_hours = qty`, `end_datetime = start + (regular_hours + qty) hours`            |
| Change `unit_rate` on regular    | Update `hourly_rate` and recompute `rate_applied = regular_hours × hourly_rate + overtime_hours × overtime_rate` |
| Change `unit_rate` on overtime   | Update `overtime_rate` and recompute `rate_applied`                          |
| Delete an overtime line          | Set `overtime_hours = 0`, `overtime_rate = null`, recompute `end_datetime` and `rate_applied`     |
| Delete a regular line            | Stays as-is (the line is gone but the shift remains; warn user this orphans the shift from the invoice) |

This logic lives in a new helper `src/lib/shiftInvoiceSync.ts` (`syncShiftFromLineEdit(shift, allLinesForShift)`) so it's testable and can be reused by `BulkInvoiceDialog` / future flows.

`InvoiceEditPanel`'s existing `onUpdateLineItem` / `onDeleteLineItem` callbacks call the helper, then `updateShift(...)` from `useData()`. An activity log entry ("Synced shift X to match invoice line edit") is appended via `onAddActivity`.

**Guardrails:**
- Only sync when the invoice is in **draft** status. Sent/paid invoices freeze the shift link (we don't want a paid invoice silently rewriting historical shifts).
- Only sync `line_kind` of `regular` or `overtime` — `flat` and `custom` lines never touch the shift.
- If the shift is referenced by another invoice line item (across invoices), block the sync and show a toast: "This shift is on multiple invoices. Edit there or unlink first." (Edge case — unlikely in practice but worth catching.)

### Part 3 — Small UX touches

- On the shift card in the invoice editor, add a tiny helper line under the qty/rate inputs: *"Editing this updates the shift on your schedule."* (Only shown for draft invoices on hourly shift lines.)
- After a sync, `useData()`'s realtime subscription already refreshes the shift in `SchedulePage` and elsewhere — no extra wiring.
- The existing tax-withholding nudge at the bottom of the invoice editor will recompute automatically once the shift's `rate_applied` updates.

### Files to change

- `src/components/invoice/InvoiceEditPanel.tsx` — add per-shift "+ Add overtime" button, helper text under hourly qty inputs, wire edit/delete handlers through the new sync helper.
- `src/lib/shiftInvoiceSync.ts` *(new)* — pure helper: given a shift + its line items after an edit, return the updated shift fields. Re-uses `roundToQuarter` and `computeShiftTotal` from `src/lib/overtime.ts`.
- `src/test/shiftInvoiceSync.test.ts` *(new)* — Vitest cases: regular qty change updates end_datetime, OT qty change preserves regular hours, deleting OT line zeros OT fields, sent invoice blocks sync.

### Untouched

- `BulkInvoiceDialog`, `buildAutoInvoiceDraft`, auto-invoice generation — already correct.
- `ShiftFormDialog` — still the canonical shift editor; the invoice-side edits just write the same fields it does.
- DB schema — no migration needed; we're using existing `shifts.regular_hours`, `overtime_hours`, `overtime_rate`, `end_datetime`, `hourly_rate`, `rate_applied`.

