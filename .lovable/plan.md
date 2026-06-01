# Monthly Mileage Report — Per-Trip Log + Monthly Totals

Rework the Monthly Mileage Report (inline preview, PDF, and CSV) so every trip is listed with date, place, and miles, and rolled up into a 12-month summary.

## Report structure

**1. Monthly Summary (always 12 rows: Jan–Dec of the selected year)**

| Month | Trips | Miles | IRS Rate | Deduction ($) |
|---|---|---|---|---|
| Jan 2026 | 0 | 0 | $0.70 | $0.00 |
| Feb 2026 | 4 | 312 | $0.70 | $218.40 |
| … | | | | |
| **Total** | … | … | — | … |

Empty months show `0 / 0 / $0.00` so the year reads cleanly.

**2. Trip Log (grouped by month, only months with activity)**

```
── February 2026 ─────────────────────────────────
Date         Place                                          Miles
2026-02-04   Taylor Animal Hospital                          78
             1234 Main St, Columbus, OH 43215
2026-02-11   Greenfield Medical Center                       52
             88 Park Ave, Cleveland, OH 44106
                                       Subtotal:  130 mi  /  $91.00
```

Place column = **clinic name + full address** (address on a second line in PDF so the table doesn't wrap awkwardly; CSV uses a single combined cell).

## Data source

From `useCPAPrepData()` → `confirmedMileageExpenses` and `facilities`:
- **Date** → `expense_date` (string-sliced YYYY-MM-DD, no UTC drift)
- **Place** → `facilities[expense.facility_id]` → `name` + `address` (fallback: `vendor`, else `"Unlinked trip"`)
- **Miles** → `mileage_miles`
- **$** → `mileage_miles × irs_mileage_rate_cents / 100` (current rate from `expense_config`)
- **Year** → derived from the active CPA Prep date range (uses the range's start year)

## Files to change

1. **`src/lib/cpaPrepExports.ts`**
   - Add `buildMileageTripLog(expenses, facilitiesById)` → `{ monthKey, monthLabel, trips: [{date, place, address, miles, amount}], subtotalMiles, subtotalAmount }[]`
   - Update `buildMonthlyMileageRows` to emit all 12 months (zero-filled) for the active year
   - CSV builder emits: summary block → blank row → trip log grouped by month with subtotal rows

2. **`src/lib/cpaPrepPdf.ts`**
   - Mileage section: render summary `autoTable` first, then one `autoTable` per active month for trips. Address renders as a smaller second line under the clinic name (custom `didDrawCell`).

3. **`src/hooks/useCPAPrepData.ts`**
   - Expose `facilitiesById` (id → `{name, address}`) alongside `confirmedMileageExpenses`.

4. **`src/components/cpa-prep/MonthlyMileagePreview.tsx`**
   - Show the 12-month summary table (current view).
   - Add a collapsible **"Trip log"** section below it: one accordion per month listing every trip (date, place, miles), with the monthly subtotal in the header.

## Edge cases
- Unlinked expense (no `facility_id`, no `vendor`) → place = "Unlinked trip", address blank.
- Months with zero trips → present in summary as $0 row; omitted from trip log.
- Trips sorted ascending by date within each month; months ascending Jan→Dec.
- Year boundary: only trips whose `expense_date` year matches the report year are included.

## Out of scope
- Trip purpose/notes column
- Editing trips from the preview
- Excel (.xlsx) export
- Multi-rate handling (still single current IRS rate)
