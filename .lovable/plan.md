## Add PDF download to Mileage Report

Extend the Mileage Report card on the Mileage Tracker tab to also export a PDF, alongside the existing CSV.

### Changes

1. **`src/lib/mileageReportCsv.ts`** — add `buildFilteredMileagePdf(trips, rangeLabel, irsRateCents): jsPDF` using `jspdf` + `jspdf-autotable` (already used by `src/lib/cpaPrepPdf.ts`). Layout mirrors the CSV:
   - Title: "Mileage Report — {rangeLabel}"
   - Subline: IRS rate per mile
   - Summary row: Trips · Total miles · Total deduction
   - autoTable: Date · Clinic · Route · Miles · Deduction · Status
   - Footer with page numbers

2. **`src/components/expenses/MileageReportCard.tsx`** — replace the single "Download CSV" button with the existing `SectionExportMenu` pattern (from `src/components/cpa-prep/SectionExportMenu.tsx`) so the user picks PDF or CSV from a dropdown. Filename stem: `mileage-report_{safeRangeLabel}`.

No backend, schema, or filter logic changes.
