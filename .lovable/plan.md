## Goal

Let users add **overtime charges per shift** when reviewing an invoice. The overtime amount flows back to the shift so the calendar, dashboard, and business revenue reflect the higher total — without breaking any existing shifts, invoices, or auto-generation logic.

## Design overview

We already have an `invoice_line_items` table with a `line_kind` column (`'regular' | 'flat'`). We extend that with a third kind, **`'overtime'`**, instead of inventing a parallel table. This keeps invoice math, PDF rendering, payment allocation, and totals in one well-tested place.

On the shift side, we add two optional fields — **`overtime_hours`** and **`overtime_rate`** — so the shift itself remembers the extra time/charge. That's what the calendar, shift detail, dashboard "anticipated income", and tax/business revenue read from.

A small bi-directional sync (mirroring the existing `shiftInvoiceSync`) keeps the two in lockstep on draft invoices.

```text
┌────────────────────┐   add overtime line   ┌────────────────────────┐
│  Invoice Edit      │ ────────────────────▶ │ invoice_line_items      │
│  Panel (per shift) │                        │  line_kind = 'overtime' │
└────────────────────┘ ◀──── totals ─────────┴────────────────────────┘
          │                                              │
          │ sync (draft only)                            │
          ▼                                              ▼
┌────────────────────┐                        ┌────────────────────────┐
│ shifts.overtime_*  │ ─── reads ───────────▶ │ Calendar / Shift card  │
│                    │                        │ Dashboard revenue      │
│                    │                        │ Tax & business reports │
└────────────────────┘                        └────────────────────────┘
```

## UX

In `InvoiceEditPanel`, under each shift-linked line, add a small **"+ Add overtime"** action. It inserts a second line item attached to the same `shift_id` with:

- Description prefilled: *"Overtime — {date}"* (editable)
- Qty = hours (default 1, quarter-hour steps, matching regular lines)
- Unit rate = prefilled from the shift's hourly rate (or blank for flat-rate shifts so the user enters their own number)
- A subtle "Overtime" tag pill on the row so it's visually distinct from the base line
- Remove (×) button, same as today

On the **shift detail / calendar tooltip / shift card**, when `overtime_hours > 0` show a single line: *"+2.0 h overtime · $300"* under the base rate, and include it in the shift total displayed.

The dashboard "Needs attention" / revenue widgets and the Business Insights YTD numbers already sum from shifts + invoices — they pick up the new overtime automatically once the data model is wired (see Technical section).

## Backwards compatibility

- New shift columns are **nullable with default `0`** — existing shifts read as "no overtime", behavior unchanged.
- New `line_kind = 'overtime'` is additive; existing UI branches on `'regular'` vs `'flat'` and falls through safely. We add explicit handling rather than changing existing branches.
- Auto-generation (`buildAutoInvoiceDraft`) **also emits an overtime line** when the shift has `overtime_hours > 0`, so re-generating a draft for a shift that already had overtime preserves it. Shifts without overtime are unaffected.
- `syncShiftFromLineItems` keeps current behavior for the regular line and additionally writes back overtime fields — no behavior change for shifts with no overtime line.
- Sent/paid invoices remain immutable as today (the "+ Add overtime" button is hidden unless `invoice.status === 'draft'`).
- Invoice PDF and payment allocation already iterate `line_items` generically, so overtime lines render and contribute to totals with no template change.

## Technical section

**Migration (additive, non-breaking):**

```sql
ALTER TABLE public.shifts
  ADD COLUMN overtime_hours numeric NOT NULL DEFAULT 0,
  ADD COLUMN overtime_rate  numeric NOT NULL DEFAULT 0;
```

`invoice_line_items.line_kind` is already `text`, so `'overtime'` is accepted with no schema change.

**Types (`src/types/index.ts`):**

- `InvoiceLineKind`: add `'overtime'`.
- `Shift`: add `overtime_hours?: number; overtime_rate?: number;`.

**Files to touch:**

1. `src/components/invoice/InvoiceEditPanel.tsx` — render overtime rows with a tag, add "+ Add overtime" button per shift group, hide on non-draft.
2. `src/lib/shiftInvoiceSync.ts` — extend `syncShiftFromLineItems` to also pick the `'overtime'` line for the shift and emit `overtime_hours` / `overtime_rate` in the patch. Update `canSyncShiftForLine` to allow `'overtime'`.
3. `src/lib/invoiceAutoGeneration.ts` — after the regular/flat line, push an extra `'overtime'` line when `s.overtime_hours > 0`. Include it in the `total` reduce (already generic).
4. `src/components/schedule/ShiftFormDialog.tsx` and shift detail/calendar cards — display overtime read-only summary; do **not** add overtime editing here (single source of truth = invoice). Show a small inline note "Edit overtime on the invoice" with a link.
5. Revenue/insights surfaces (`FinancialHealthTab`, `DashboardPage`, `useCPAPrepData`, `BusinessInsights`) — replace any `sum(rate_applied)` with `sum(rate_applied + overtime_hours * overtime_rate)`. One small helper `getShiftTotalRevenue(shift)` keeps it consistent.
6. Tests: extend `invoiceAutoGeneration.test.ts`, `invoiceDraftTotals.test.ts`, and add a focused test for `shiftInvoiceSync` with an overtime line.

**Sync rules (important):**

- Overtime only syncs while the invoice is `draft` (same rule as regular lines).
- Deleting the overtime line on a draft → sets `overtime_hours = 0`, `overtime_rate = 0` on the shift.
- Editing qty or unit_rate on the overtime line → mirrors to `overtime_hours` / `overtime_rate`.
- Shift-side has no editor for overtime in v1 (avoids two-writer conflicts). Source of truth = the invoice line.

**Memory note (after implementation):** Add a Core rule — *"Overtime is captured as a per-shift invoice line (`line_kind='overtime'`); shift fields `overtime_hours` / `overtime_rate` are derived from it and feed revenue."*

## Out of scope (call out for later)

- Auto-detecting overtime from clock-in/clock-out (we don't track actuals yet).
- Per-facility overtime rate defaults (could later read from `contract_terms`).
- Surcharges other than overtime (holiday premium, callback fee). The same `line_kind` extension pattern would apply.