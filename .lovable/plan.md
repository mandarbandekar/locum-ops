# Add "Due upon receipt" payment terms option

Add a new "Due upon receipt" choice at the end of the existing payment terms selectors. Internally this maps to `invoice_due_days = 0` so it works with the existing due-date math (`invoice_date + 0 days = today`).

## Changes

**1. `src/components/facilities/AddClinicStepper.tsx` (clinic creation chips)**
- Append `0` to `NET_TERMS = [7, 14, 15, 30, 45, 60, 0]`.
- In the chip render, label `0` as `Due upon receipt` instead of `0 days`.

**2. `src/components/facilities/InvoicingPreferencesCard.tsx` (per-clinic edit)**
- Add `<SelectItem value="0">Due upon receipt</SelectItem>` as the last option in the Payment Terms select.
- In the read-only summary row, show `Due upon receipt` when `invoice_due_days === 0`, otherwise `Net N`.

**3. `src/pages/SettingsInvoicingPage.tsx` (global default)**
- Add `<SelectItem value="0">Due upon receipt</SelectItem>` as the last option in the Default due date select.

## Display label helper

Add a tiny helper (inline or in `src/lib/invoiceHelpers.ts`) — `formatPaymentTerms(days)` returning `"Due upon receipt"` for `0` and `"Net N"` otherwise — and reuse it in the read-only summary and any other places that already render `Net {invoice_due_days}` (e.g. `InvoiceOnboardingStepper`, `FacilityImportDialog`, `ImportReviewPanel`, `ContractsTab` pills).

## Notes

- No database changes needed; `invoice_due_days = 0` is already a valid integer.
- `invoiceAutoGeneration.ts` uses `facility.invoice_due_days || 15` — the `||` would fall back to 15 for `0`. Update those few spots to use `?? 15` so an explicit `0` is honored.
