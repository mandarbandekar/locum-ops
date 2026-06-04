## Goal

Expose detailed, filterable, downloadable mileage reports directly inside the Mileage Tracker tab (currently only available inside CPA Prep packet). Rename the tab "Mileage" → "Mileage Tracker".

## Changes

### 1. Rename tab label
`src/pages/ExpensesPage.tsx` — Change `<TabsTrigger value="mileage">` label from "Mileage" to "Mileage Tracker". Keep `value="mileage"` unchanged.

### 2. New component: `MileageReportCard.tsx` (in `src/components/expenses/`)
A collapsible section rendered inside `MileageTrackerTab` (populated state, below "Money claimed"). Provides:

**Filters (toolbar at top):**
- **Date range picker** (matches uploaded screenshot pattern): preset chips (This month, Last month, Last 3 months, Year to date, Last 365 days, Last year) + a "Month" mode (year navigator + 12 month buttons) + "Custom range" mode (two date inputs). Default = This month.
- **Clinic filter**: multi-select dropdown of clinics that have mileage in the active range (defaults to "All clinics").
- **Status filter**: All / Confirmed only / Draft only (default Confirmed only — matches CPA semantics).

**Summary strip** (3 stat tiles): Trips, Total miles, Deduction $ (recomputed at IRS rate of the active year).

**Detail table:** Date · Clinic · Route description · Miles · Deduction. Sorted by date desc. Empty state when no trips in range.

**Download button** (top-right): "Download CSV" — generates a CSV matching the existing `mileageCsv` style but scoped to current filters. Filename: `mileage-report_{range-label}.csv` (e.g. `mileage-report_2026-06.csv`, `mileage-report_2026-01-01_to_2026-03-31.csv`).

### 3. Helper in `src/lib/cpaPrepExports.ts` (or a new sibling `src/lib/mileageReportCsv.ts`)
Add `buildFilteredMileageCsv(expenses, facilities, { start, end, clinicIds, status }, irsRateCents, rangeLabel)` returning a CSV string. Reuse `toCsv`, `fmt`, `fmtMiles`, `fmtRate` helpers. CSV includes header (range + IRS rate), summary totals, then per-trip rows.

### 4. Wire into `MileageTrackerTab.tsx`
- Pass through `expenses` (already received), `confirmedMileageExpenses`, `draftMileageExpenses`, `config.irs_mileage_rate_cents`, `facilities` (from `useData()` already there).
- Insert `<MileageReportCard ... />` between the "Money claimed" section and the dialogs.

## Out of scope
- No backend / schema changes (all client-side filtering and CSV generation).
- Does not touch the CPA Prep packet flow — that continues to work as-is.
- No PDF export (CSV only, matching existing pattern).

## Technical notes
- Date filtering uses string comparison on `expense_date` (already 'YYYY-MM-DD' per project memory) to avoid TZ shifts.
- "Year to date" = Jan 1 of current year → today (clinic-tz unnecessary; expense_date is date-only).
- Preset chips use existing `Button` + `cn` semantic tokens — no new colors.
- Picker UI built with existing `Popover` + `Tabs` primitives; no new deps.