

# Add "Financial Health" Tab to Relief Business Insights

## Current State

The "Revenue & Work" tab (`ReportsPage`) already covers most revenue and invoice metrics. The Tax Estimate tab has the tax reserve tracker. Expense data exists in `useExpenses` but is not surfaced on the Business Insights page at all.

### What Already Exists vs What's New

| Requested | Status | Notes |
|---|---|---|
| Monthly revenue | Exists | ReportsPage monthly revenue chart |
| Revenue by clinic | Exists | Revenue by Facility chart |
| Revenue trend over time | Exists | Monthly Revenue stacked bar |
| Revenue by shift type | New | Need to group by weekday/weekend/holiday rate tiers |
| Total invoiced/paid/outstanding | Exists | KPI cards |
| Overdue invoices | Partially | Outstanding lumps sent+overdue together |
| Average days to payment | Partially | Per-facility exists, global average missing |
| Tax reserve estimate | Exists in TrackerTab | Need a compact summary card here |
| Expenses by category | New for this page | Data available via `useExpenses` |
| Monthly expense trend | New | Compute from expenses by month |
| Top expense categories | New | Derived from ytdByCategory |
| Missing expense reminders | New | Count uncategorized + missing receipts |

## Plan

**Replace** the "Revenue & Work" tab with a new **"Financial Health"** tab that reorganizes existing content into 4 clear sections and adds the missing pieces.

### File Changes

| File | Change |
|---|---|
| `src/pages/BusinessPage.tsx` | Rename tab from "Revenue & Work" to "Financial Health", update icon to `Heart`/`Activity` |
| `src/components/business/FinancialHealthTab.tsx` | **New** — orchestrator component with 4 collapsible sections |
| `src/pages/ReportsPage.tsx` | Keep as-is (still used internally by FinancialHealthTab for revenue charts) — OR refactor into sub-components. To minimize risk, the new tab will import and reuse ReportsPage directly for Section 1, and add new sections below it. |

Actually, to keep things clean and avoid breaking ReportsPage, I'll build FinancialHealthTab as a wrapper that:

1. **Section 1 — Revenue Overview**: Embeds existing `ReportsPage` content (month selector, AI summary, KPI cards, all charts)
2. **Section 2 — Invoice & Cash Flow**: New section with overdue breakdown, global avg days to payment, and a compact AR summary
3. **Section 3 — Tax Reserve Estimate**: Compact card showing estimated quarterly obligation, set-aside status, and on-track/behind/at-risk badge
4. **Section 4 — Expense Visibility**: New section with expense category breakdown, monthly expense trend chart, top categories, and missing receipt warnings

### Detailed Changes

**`src/components/business/FinancialHealthTab.tsx`** (New)
- Imports `ReportsPage` for Section 1
- Computes invoice/cash flow metrics from `useData()` for Section 2:
  - Separate overdue from sent/partial
  - Global average days to payment
  - Total draft / sent / overdue / paid with amounts
- Pulls tax reserve data from `tax_settings` + `tax_quarter_statuses` for Section 3:
  - Estimated annual tax (from `estimateTotalTax`)
  - Amount already paid this year
  - Status badge: "On Track" / "Behind" / "At Risk"
- Uses `useExpenses()` for Section 4:
  - Expense category bar chart (horizontal bars by category)
  - Monthly expense trend line chart
  - Top 5 categories list
  - Warnings: X uncategorized, Y missing receipts (>$75)

**`src/pages/BusinessPage.tsx`**
- Change tab label from "Revenue & Work" to "Financial Health"
- Change icon to `Activity` (pulse/heartbeat)
- Render `FinancialHealthTab` instead of `ReportsPage`

### No Database Changes

All data comes from existing tables via `useData()`, `useExpenses()`, and existing tax settings queries.

### Section Layout

```text
Financial Health Tab
├── Section 1: Revenue Overview (collapsible, default open)
│   └── [Existing ReportsPage content — unchanged]
├── Section 2: Invoice & Cash Flow (collapsible, default open)
│   ├── Summary cards: Draft | Sent | Overdue | Paid (count + $)
│   ├── Avg Days to Payment (global number)
│   └── Overdue invoices list (name, amount, days overdue)
├── Section 3: Tax Reserve Status (collapsible, default open)
│   ├── Estimated Annual Tax | Paid YTD | Remaining
│   ├── Status badge (On Track / Behind / At Risk)
│   └── Link to Tax Estimate tab for details
└── Section 4: Expense Visibility (collapsible, default open)
    ├── Summary: Total expenses | Total deductible | Categories tracked
    ├── Monthly Expense Trend (line chart)
    ├── Top 5 Categories (horizontal bar chart)
    └── Warnings: missing receipts, uncategorized items
```

