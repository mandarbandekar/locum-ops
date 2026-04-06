

# Enhance CPA Prep Tab — Quarterly Tax Prep Dashboard

## What Already Exists (Will NOT Rebuild)

| Requested Feature | Already Exists In | Status |
|---|---|---|
| YTD income / quarterly income | `TrackerTab` + `ReportsPage` | Done |
| Tax estimate (SE tax, federal) | `TrackerTab` via `taxCalculations.ts` | Done |
| Quarterly payment tracker (Q1-Q4) | `TrackerTab` (status, due dates, notes) | Done |
| S-Corp explorer / entity assessment | `SCorpAssessmentTab` | Done |
| Relief Deduction Guide (8 categories) | `OpportunityReviewTab` | Done |
| CPA Questions list + summary export | `CPAPrepSummaryTab` | Done |
| Intake Profile sidebar | `IntakeCard` | Done |
| Tax readiness checklist (12 items) | `TrackerTab` (checklist section) | Done |
| Revenue charts + AI summary | `ReportsPage` | Done |
| Ask Tax Advisor (AI chat) | `AskAdvisorTab` | Done |
| Expense tracking + categories | `useExpenses` + expense pages | Done |
| Mileage tracking | Mileage Tracker tab + auto-mileage | Done |

## What's New — The Gap

The current CPA Prep tab only has the Deduction Guide + CPA Questions. It lacks **financial data consolidation** — the actual numbers a CPA needs. The user wants one unified dashboard that pulls together existing data into a quarterly snapshot.

## Plan: Redesign CPAPrepTab as a Multi-Section Dashboard

Replace the current CPA Prep tab content with a dashboard that has **collapsible sections**, each pulling from existing data (no new DB tables needed).

### New Sections in CPA Prep Tab

**1. Quarterly Tax Snapshot (NEW — top of page)**
- Summary cards pulling from existing data:
  - YTD Gross Income (from paid invoices via `aggregateQuarterlyIncome`)
  - YTD Deductible Expenses (from `expenses` table, sum of `deductible_amount_cents`)
  - Estimated Net Income (income minus expenses)
  - Quarterly Taxes Paid (from `tax_quarter_statuses` where status = 'paid')
  - Projected Annual Income (annualized from YTD)
  - Next Payment Due (from quarter statuses)
  - Outstanding Invoices (sent/overdue invoices balance)
  - Entity Type (from `tax_advisor_profiles` or user profile)
- Tone: "You've logged $84,200 in income this year."

**2. Profit & Loss Summary (NEW)**
- Collapsible card showing:
  - Income total
  - Expenses grouped by category (from `expenses` table subcategories mapped to tax buckets)
  - Net income
  - Monthly breakdown table (12 rows)
  - Quarterly breakdown (4 rows)
- All computed client-side from existing `invoices` + `expenses` data

**3. Income by Clinic (NEW)**
- Table showing per-facility:
  - Clinic name, state
  - Shifts worked count
  - Revenue billed (invoice totals)
  - Paid vs unpaid amounts
- Pulls from existing `invoices`, `shifts`, `facilities` in DataContext

**4. Accounts Receivable / Unpaid Invoices (NEW)**
- Summary cards: Draft / Sent / Overdue / Paid counts + amounts
- Aging buckets: 0-30 days, 31-60, 61-90, 90+ (computed from `due_date`)
- Pulls from existing `invoices` in DataContext

**5. Expense Review by Tax Category (NEW)**
- Groups expenses into IRS-relevant buckets (mileage, CE, licenses, equipment, etc.)
- Shows per-category: total, receipt count, missing receipts flag
- Flags: uncategorized expenses, expenses over $75 without receipts, large one-time purchases
- Pulls from existing `expenses` data via `useExpenses`

**6. Mileage & Travel Summary (NEW)**
- Total business miles YTD
- Deduction amount at IRS rate
- Top clinic destinations by miles
- Pulls from `expenses` where `category = 'mileage_travel'`

**7. CPA Readiness Checklist (NEW — data-driven)**
- Auto-generated flags based on actual data gaps:
  - X uncategorized expenses
  - X expenses missing receipts (over $75)
  - X unpaid invoices not reviewed
  - No estimated tax payments logged
  - Entity type not set
  - Missing mileage for shifts with known clinic addresses
- Each item links to the relevant part of the app

**8. CPA Discussion Agenda (NEW — auto-generated)**
- Smart suggestions based on data:
  - If income > $80k: "Review S-Corp election timing"
  - If multi-state facilities: "Discuss multi-state filing obligations"
  - If no retirement expenses: "Review retirement contribution options"
  - If quarterly payment overdue: "Confirm next quarterly payment"
  - If large purchase: "Review depreciation for purchases over $2,500"

**9. Existing Sections (KEPT)**
- Relief Deduction Guide (moved to collapsible section)
- CPA Questions & Summary (moved to collapsible section)
- Intake Profile sidebar (kept)

**10. Export CPA Packet (NEW)**
- "Export for CPA" button generates a comprehensive text/CSV summary combining all sections
- Uses the existing `buildSummaryText` pattern but adds financial data

### File Changes

| File | Change |
|---|---|
| `src/components/business/CPAPrepTab.tsx` | Major rewrite — becomes the dashboard orchestrator with collapsible sections |
| `src/components/cpa-prep/QuarterlySnapshot.tsx` | **New** — summary cards component |
| `src/components/cpa-prep/ProfitLossSummary.tsx` | **New** — P&L with monthly/quarterly breakdown |
| `src/components/cpa-prep/IncomeByClinic.tsx` | **New** — per-facility income table |
| `src/components/cpa-prep/AccountsReceivable.tsx` | **New** — invoice aging/status summary |
| `src/components/cpa-prep/ExpenseReview.tsx` | **New** — expenses grouped by tax category |
| `src/components/cpa-prep/MileageSummary.tsx` | **New** — mileage/travel rollup |
| `src/components/cpa-prep/ReadinessChecklist.tsx` | **New** — data-driven gap analysis |
| `src/components/cpa-prep/DiscussionAgenda.tsx` | **New** — smart CPA topic suggestions |
| `src/components/cpa-prep/ExportCPAPacket.tsx` | **New** — export button + text builder |
| `src/hooks/useCPAPrepData.ts` | **New** — single hook that aggregates invoices, expenses, shifts, facilities, tax settings into CPA-ready computed values |
| `src/pages/BusinessPage.tsx` | Minor — pass additional data props to CPAPrepTab |

### No New Database Tables

All data comes from existing tables: `invoices`, `expenses`, `facilities`, `shifts`, `tax_quarter_statuses`, `tax_settings`, `tax_advisor_profiles`, `invoice_payments`. The new `useCPAPrepData` hook queries these and computes derived values client-side.

### Data Flow

```text
useCPAPrepData hook
  ├── DataContext (invoices, shifts, facilities, lineItems, payments)
  ├── useExpenses (expenses, ytd totals, mileage)
  ├── tax_quarter_statuses (quarterly payment tracking)
  ├── tax_settings (filing preferences)
  └── tax_advisor_profiles (entity type, intake)

  Returns:
  ├── snapshot: { ytdIncome, ytdExpenses, netIncome, taxesPaid, ... }
  ├── pnl: { monthly[], quarterly[], byCategory[] }
  ├── clinicIncome: { facilityId, name, shifts, billed, paid, unpaid }[]
  ├── receivables: { draft, sent, overdue, paid, aging[] }
  ├── expenseReview: { category, total, receiptCount, missingReceipts }[]
  ├── mileage: { totalMiles, deductionCents, byClinic[] }
  ├── readiness: { items: { label, status, link }[] }
  └── agenda: { topics: string[] }
```

### Design Direction

- Calm, trustworthy cards with clear numbers
- Collapsible sections so the page doesn't overwhelm
- Plain-language labels ("You've earned...", "X items need attention")
- Empty states that guide users ("Start tracking expenses to see your deduction summary")
- Disclaimer banner kept at top

