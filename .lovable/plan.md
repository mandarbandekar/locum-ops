## Goal

Replace the single "Export CPA Packet" text dump with per-section, per-month **PDF + CSV** downloads. Every section under CPA Prep / Tax Intelligence gets its own monthly breakdown. Mileage gets a featured Monthly Mileage Report showing `miles × IRS rate = $`.

## What the user gets

Each section card in CPA Prep grows a small "Export" dropdown with two buttons: **PDF** and **CSV**. Both files are broken out by month (Jan → current month), with YTD totals.

Sections covered:
1. **Monthly Mileage Report** (the highlight) — month rollup + clinic detail
2. Profit & Loss Summary
3. Income by Clinic
4. Accounts Receivable
5. Expense Review by Tax Category
6. CPA Readiness Checklist (PDF only — not numeric)

A top-level "Export Full CPA Packet" stays, but becomes a **single multi-page PDF** combining all sections (replacing the current .txt).

## Monthly Mileage Report — structure

**Header:** Tax year, IRS rate used (from `expense_config.irs_mileage_rate_cents`, e.g. `$0.70/mi`), generated date.

**Section A — Monthly Rollup table**

| Month | Business Miles | IRS Rate | Deduction ($) |
|---|---|---|---|
| Jan | 412 | $0.70 | $288.40 |
| … | | | |
| **YTD** | **4,820** | — | **$3,374.00** |

**Section B — Clinic Detail (per month)**
For each month with mileage, a sub-table:

| Clinic | Trips | Miles | Deduction ($) |

**Section C — Footer:** starting balance note (if `startingMiles > 0`), IRS-rate disclaimer.

Calculation: `deduction = round(miles × irs_mileage_rate_cents) / 100`, applied uniformly with the **current rate from `expense_config`** (per your choice). One italic line notes the assumption so the CPA can adjust if the rate changed mid-year.

## Technical approach

### New shared module: `src/lib/cpaPrepExports.ts`
Pure functions that take `useCPAPrepData()` output + raw `confirmedMileageExpenses` and return:
- `buildMonthlyMileageRows(expenses, year, irsRateCents)` → `{ month, miles, rateCents, deductionCents }[]`
- `buildMonthlyMileageByClinic(expenses, facilities, year)` → `Record<month, ClinicRow[]>`
- `buildMonthlyPnL`, `buildMonthlyClinicIncome`, `buildMonthlyExpenseReview`, `buildMonthlyReceivables` — each returns a normalized `{ columns, rows, totals }` shape.

This keeps export logic out of components and unit-testable.

### CSV generation (client-side)
Tiny helper `toCsv(rows, columns)` in the same module. Triggered via Blob download — same pattern as the existing `ExpenseSummaryTab.exportCSV`. No new deps.

### PDF generation (client-side, no edge function)
Use **`jspdf` + `jspdf-autotable`** (small, already common in this stack; add via `bun add`). Client-side keeps it instant and avoids spinning up an edge function for a read-only export.

Helper `src/lib/cpaPrepPdf.ts`:
- `renderSectionPdf(title, subtitle, tables[])` → returns a `jsPDF` doc
- `renderFullPacketPdf(allSections)` → combines into a single multi-page doc with a cover page

Branding: LocumOps wordmark in header, generated date + user name in footer, disclaimer block on last page. Uses the same disclaimer copy as today's `.txt`.

### UI wiring
- New small component `src/components/cpa-prep/SectionExportMenu.tsx` — a `DropdownMenu` with "Download PDF" and "Download CSV" items. Drop one into each `<Section>` header in `CPAPrepTab.tsx` (right-aligned next to the chevron).
- Replace `ExportCPAPacket.tsx` body to call `renderFullPacketPdf` → PDF download instead of `.txt`. Keep the button placement.

### Data flow
`CPAPrepTab` already calls `useCPAPrepData()`. Pass the hook's result plus `confirmedMileageExpenses` and `config.irs_mileage_rate_cents` (already exposed by `useExpenses`) down into each section's export menu. No new queries, no schema changes.

### Files touched
- **New:** `src/lib/cpaPrepExports.ts`, `src/lib/cpaPrepPdf.ts`, `src/components/cpa-prep/SectionExportMenu.tsx`, `src/components/cpa-prep/MonthlyMileageReport.tsx` (optional in-app preview table — see "Open question" below), `src/test/cpaPrepExports.test.ts`
- **Edit:** `src/hooks/useCPAPrepData.ts` (expose `monthlyMileage` + `irsRateCents`), `src/components/business/CPAPrepTab.tsx` (mount export menus), `src/components/cpa-prep/ExportCPAPacket.tsx` (swap .txt → PDF), `src/components/cpa-prep/MileageSummary.tsx` (add a small "Monthly breakdown" expandable preview)
- **Deps:** `bun add jspdf jspdf-autotable`

### Testing
Vitest covering:
- Monthly bucketing across timezone boundaries (dates use `expense_date` string — no UTC shift)
- IRS rate × miles math with rounding
- Empty-month rendering (zeros, not skipped)
- CSV escaping for commas / quotes in clinic names

## Out of scope
- Excel (.xlsx) output — you opted for PDF + CSV. Easy to add later via `xlsx` lib using the same row builders.
- Multi-rate handling (rate change mid-year). Disclaimer flags it; CPA can adjust.
- Server-side generation / emailing the packet.

## Open question I'll proceed with unless you say otherwise

Show the **Monthly Mileage rollup table inline in the Mileage section** (collapsible, default closed) so users see what the PDF will contain before downloading. Tell me if you'd rather keep the in-app UI unchanged and have the monthly view live only inside the downloaded files.
