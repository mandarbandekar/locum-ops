## Goal

Replace the **Qty** column with **Hours** (billable hours worked) on every invoice surface — in-app preview, generated PDF, and the public share link. Hours come from the linked shift's billable minutes (start/end minus unpaid break), not from `qty`.

## Display rules

For each line item:
- **Has a linked shift** → show billable hours from the shift (e.g. `8`, `9.5`, `10:30 → 10.5h`), using the existing `getBillableMinutes` / `formatBillableHours` helpers in `src/lib/shiftBreak.ts`. Works the same for flat-rate and hourly shifts.
- **Overtime line** → show `qty` as hours (already in hours).
- **Standalone line, no shift** (manual entry) → show `—`.
- Column header label changes from `Qty` to `Hours`.
- Rate column unchanged (still shows the unit_rate); per the day-rate memory we do not append `/hr`.

The underlying `qty` / `unit_rate` / `line_total` values are not modified — this is purely a display change so invoice math, totals, audits, and the `audit_invoice_line_mismatches` function are unaffected.

## Files to change

1. **`src/components/invoice/InvoicePreview.tsx`** — the in-app + public preview, used by `PublicInvoicePage`, `InvoiceDetailPage`, and email send flow.
   - Desktop table (line ~308): header `Qty` → `Hours`; cell renders billable hours from shift when `shift_id` is present, else `—` (or hours for overtime lines).
   - Mobile stacked rows (line ~295): replace `${qy} hrs` / `${qy} ×` with the same hours-from-shift logic.
   - Accept an optional `shifts` lookup prop (`Record<string, { start_datetime; end_datetime; break_minutes; worked_through_break }>`) so the component can resolve hours without re-fetching.

2. **`src/pages/InvoiceDetailPage.tsx`** — pass the shifts map (already loaded via DataContext) into `InvoicePreview`.

3. **`src/pages/PublicInvoicePage.tsx`** — receive a `shifts` map from the public-invoice edge function and pass it to `InvoicePreview`.

4. **`supabase/functions/public-invoice/index.ts`** — additionally fetch the linked shifts (`id, start_datetime, end_datetime, break_minutes, worked_through_break`) for the invoice's line items and return them in the JSON response.

5. **`src/lib/invoicePdf.ts`** — same column rename + hours-from-shift logic for the PDF renderer (table header + row cell).

6. **`supabase/functions/generate-invoice-pdf/index.ts`** — server-side PDF generator: rename column header and pull billable hours from the linked shift when rendering each line. Port the small `getBillableMinutes` helper into `supabase/functions/_shared/` so client and edge share one implementation.

7. **`supabase/functions/_shared/shiftBreak.ts`** (new) — minimal port of `getScheduledMinutes`, `getBillableMinutes`, `formatBillableHours` so the edge function uses the same logic as the client.

## Out of scope

- No DB migration. `invoice_line_items.qty` keeps its existing semantics (qty for hourly, 1 for flat, hours for overtime) — only the visual label and rendered value change.
- No change to invoice totals, edit form, or line-item creation logic.
- Email templates that reference qty are unchanged unless they render the table (none currently do — they show totals only).

## Verification

- Open an invoice with both a flat-rate shift and an hourly shift → desktop + mobile previews show real hours for each.
- Generate a PDF and open the public share link → both show the same Hours column.
- Add a manual standalone line (no shift) → Hours cell renders `—`.
- Invoice totals and the Rate column remain unchanged.
