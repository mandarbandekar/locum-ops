

## Add Overtime Logic to Shifts & Invoices

### Background

Hourly shifts now compute `total = hours × hourly_rate`. Real locum contracts often pay a higher rate after a daily threshold (commonly 8 hrs/day, sometimes 10 or 12). Today there's no way to capture that — a 12-hour hourly shift bills at straight time even if the contract calls for 1.5× after 8.

This adds optional **per-rate overtime** that the user controls manually, applied automatically to hourly shifts and reflected on the invoice as separate line items.

### Recommendation: per-rate overtime on hourly rates only

Overtime is a property of an *hourly* rate definition (it's meaningless on a flat day rate). When the user toggles a rate to **Hourly**, two new optional fields appear:

- **Overtime after** (hours/day) — e.g. `8`
- **Overtime rate** ($/hr) — e.g. `142.50`, with a quick "1.5× base" / "2× base" shortcut button

If left blank, behavior is identical to today (no overtime). This keeps the model fully backwards-compatible and avoids forcing every rate to declare an OT policy.

### 1. Data model (one schema migration)

**`terms_snapshots`** — add structured overtime per predefined rate, mirroring `rate_kinds`:
- New column `overtime_config jsonb default '{}'` storing
  `{ weekday: { threshold_hours: 8, ot_rate: 142.50 }, weekend: {...} }`.
- `custom_rates[]` entries gain optional `overtime_threshold_hours` and `overtime_rate` fields.

**`shifts`** — capture how OT was calculated so totals don't drift if the rate is later edited:
- `overtime_hours numeric default 0` — hours billed at OT rate for this shift
- `overtime_rate numeric` — OT $/hr snapshot (null when no OT)
- `regular_hours numeric` — hours at base rate (derivable but stored for clarity/invoice consistency)

`rate_applied` keeps storing the **total** for the shift (`regular_hours × hourly_rate + overtime_hours × overtime_rate`), so all downstream dashboards, tax calc, business insights, and YTD math need zero changes.

### 2. UI changes

**RatesEditor (facility setup + facility detail "Shift Rates")**
- When a rate's kind is **Hourly**, an inline expandable "+ Overtime" link appears under the amount input.
- Expanded form: `Overtime after [8] hrs/day at [$/hr]`, with a small "1.5× = $X" / "2× = $Y" chip the user can click to auto-fill.
- Helper line under hourly rates updates to: *"Hours over 8/day will bill at $142.50/hr."* when OT is configured.

**ShiftFormDialog (Step 3 — Rate)**
- When user picks an hourly rate (or custom hourly), if that rate has OT configured AND the shift duration exceeds the threshold, the live calculation expands into two lines:
  ```
  8 hrs × $95/hr   = $760.00
  2 hrs × $142.50/hr (OT) = $285.00
  ─────────────────────────
  Total            = $1,045.00
  ```
- For custom hourly rates entered ad-hoc in the shift form, an optional "Add overtime" disclosure mirrors the RatesEditor controls (so users can apply OT one-off without saving it to facility terms).
- A subtle amber "Overtime applied" pill appears next to the rate selector when OT is in effect.
- The existing 0.25-hr rounding rule applies to both regular and OT hour buckets.

**Existing-shift edits**
- Editing an hourly shift shows the same OT breakdown; user can override OT hours/rate manually if a one-off shift had a different threshold.

### 3. Calculation rule

Standard daily-threshold OT (industry default for relief contracts):
```
total_hours = round_to_quarter((end - start) / 60)
regular_hours = min(total_hours, threshold)
overtime_hours = max(0, total_hours - threshold)
rate_applied = regular_hours * hourly_rate + overtime_hours * overtime_rate
```
- No weekly OT, no doubletime tier, no 7th-consecutive-day rules in v1 — those add a lot of edge cases and aren't standard for locum vet contracts.
- No shift spanning midnight gets split into two days for OT purposes — duration is treated per-shift (matches how relief shifts are paid).

### 4. Display on shift cards (preserves existing rules)

- Calendar chips, week grid, list view continue to show the **flat dollar total** ($1,045.00) — no `/hr` (memory rule preserved).
- The new "Hourly" pill we added gains a sibling **"OT" pill** when overtime applied, so users can see at a glance which shifts triggered overtime.
- Tooltip on hover (or expanded list view) shows the breakdown line.

### 5. Invoice impact

Invoice line items split a single OT shift into **two line items** so the PDF and customer-facing invoice show the breakdown explicitly:

```
Apr 22, 2026 — Relief coverage (8:00 AM – 6:00 PM)         8h × $95.00     $760.00
Apr 22, 2026 — Overtime (after 8 hrs)                       2h × $142.50    $285.00
```

Both line items keep `shift_id` pointing to the same shift, with a new `line_kind` column on `invoice_line_items` (`'regular' | 'overtime' | 'flat'`) so the renderer/preview/PDF can label OT lines and bulk-invoice eligibility logic still treats them as one shift (no double-billing protection issues).

### 6. Migration & backwards compatibility

- All existing rows: `overtime_config = {}`, `overtime_hours = 0`, `overtime_rate = null`, `line_kind = 'regular'` for hourly lines / `'flat'` for flat lines (set by migration based on `qty`).
- Zero behavior change for current users until they explicitly add an OT rate to a facility.
- `taxCalculations`, `businessLogic`, `invoiceAutoGeneration` totals all still read `rate_applied` and `line_total`.

### Files to change

- **Migration**: add `overtime_config` jsonb to `terms_snapshots`; add `overtime_hours`, `overtime_rate`, `regular_hours` to `shifts`; add `line_kind` text to `invoice_line_items`.
- `src/types/index.ts` — extend `TermsSnapshot`, `Shift`, `InvoiceLineItem`; add helper type `OvertimePolicy`.
- `src/lib/overtime.ts` (new) — single source of truth: `computeShiftTotal({ hours, hourly_rate, overtime_policy })` returning `{ regular_hours, overtime_hours, total }`. Used by ShiftFormDialog preview + invoice generation.
- `src/components/facilities/RatesEditor.tsx` — overtime disclosure under hourly rates; round-trip OT in `termsToRates` / `ratesToTermsFields`.
- `src/components/schedule/ShiftFormDialog.tsx` — OT-aware live calculation, OT pill, optional one-off OT disclosure for custom hourly rates, persist `overtime_*` fields and computed `rate_applied`.
- `src/lib/invoiceAutoGeneration.ts` + `src/lib/bulkInvoiceHelpers.ts` — emit two line items (regular + OT) for shifts with `overtime_hours > 0`; set `line_kind`. Eligibility/protection logic stays per-shift.
- `src/components/invoice/InvoiceEditPanel.tsx` + `src/components/invoice/InvoicePreview.tsx` — render OT lines with an "Overtime" pill/label; group sibling lines by `shift_id` visually.
- `src/components/schedule/WeekTimeGrid.tsx` + `SchedulePage.tsx` — append "OT" badge next to the Hourly badge when `overtime_hours > 0`.

### Out of scope (intentionally)

- Weekly overtime thresholds (e.g. 40 hrs/week).
- Doubletime tier (e.g. 1.5× after 8, 2× after 12).
- Automatic OT on flat day-rate shifts — flat shifts are by definition a fixed amount.
- 7th-consecutive-day overtime (CA-style rule).
- Backfilling OT onto historical shifts — only newly-added or edited shifts pick up OT.

### Open question for you

For the OT trigger, do you want:
1. **Daily threshold only** (recommended, matches standard relief contracts): "after N hrs in this shift"
2. **Daily + per-shift override**: same as #1, plus the ability to override OT hours manually on a single shift (useful for "I worked 10 hrs but contract paid OT after 6 today")

My recommendation is #2 — daily threshold as the default from facility terms, with per-shift override available in the Shift dialog for one-off situations. Implementation cost is small since we're already storing `overtime_hours` and `overtime_rate` on the shift row.

