

# Expense Tracker Module

## How It Fits Into the Existing System

The app already has:
- **Relief Deduction Guide** (Tax Advisor > Relief Deduction Guide) — educational reference cards about *what* is deductible, with CPA discussion status tracking
- **Deductions Tab** (Tax Strategy > DeductionsTab) — manual YTD category totals and documentation status tracking (no individual transactions)
- **CPA Packet Tab** — exports summary with deduction totals for CPA prep

The Expense Tracker fills the gap: **actual transaction-level expense logging** that feeds real data into those existing summary/export views. The Deduction Guide tells you *what* to track; the Expense Tracker is *where* you track it.

## Architecture

### New Database Table: `expenses`

```text
expenses
├── id (uuid, PK)
├── user_id (uuid, FK auth.users)
├── expense_date (date, NOT NULL)
├── amount_cents (integer, NOT NULL)  -- USD cents
├── category (text, NOT NULL)         -- e.g. 'mileage'
├── subcategory (text, default '')    -- e.g. 'Tolls & parking'
├── description (text, default '')
├── facility_id (uuid, nullable)      -- optional clinic link
├── shift_id (uuid, nullable)         -- optional shift link
├── receipt_url (text, nullable)      -- storage path
├── deductible_amount_cents (integer) -- auto-calculated
├── deductibility_type (text)         -- 'full' | 'fifty_percent' | 'above_the_line' | 'retirement' | 'other'
├── mileage_miles (numeric, nullable) -- only for mileage entries
├── home_office_sqft (numeric, nullable)
├── prorate_percent (numeric, nullable) -- for phone/internet
├── created_at, updated_at
```

RLS: `auth.uid() = user_id` for all operations.

### New Config Table: `expense_config`

```text
expense_config
├── id (uuid, PK)
├── user_id (uuid)
├── irs_mileage_rate_cents (integer, default 70) -- 2025: $0.70/mile
├── home_office_rate_cents (integer, default 500) -- $5/sq ft simplified
├── tax_year (integer)
├── created_at, updated_at
```

### Storage Bucket

- `expense-receipts` (private) for receipt photo uploads

## New Tab in Business Page

Add an **"Expenses"** tab (with Receipt icon) to the Business page tab bar, between Insights and Tax Tracker. This renders a new `ExpensesPage` component.

## UI Components

### 1. `src/pages/ExpensesPage.tsx`
Top-level page with sub-tabs: **Log** (default) and **Summary**.

### 2. `src/components/expenses/ExpenseLogTab.tsx`
- List of expense entries (sortable by date, filterable by category/clinic/date range)
- "Add Expense" button opens a slide-up dialog
- Each row: date, description, category badge, amount, receipt indicator, clinic tag
- Empty state: "Every mile and every license fee adds up. Start logging and we'll track what's deductible."

### 3. `src/components/expenses/AddExpenseDialog.tsx`
Quick-entry form (target: under 30 seconds):
- Date (default today)
- Category dropdown (searchable, grouped by the 11 top-level groups)
- **Conditional fields based on category:**
  - Mileage → "Miles driven" input, auto-calculates amount showing IRS rate
  - Home Office → "Square footage" input, auto-calculates using simplified method
  - Phone/Internet → "Business use %" slider, auto-calculates deductible portion
  - Business Meals → auto-flags 50% deductible, shows both amounts
- Amount ($) — pre-filled for calculated categories, editable for others
- Description (optional free text)
- Clinic tag (optional, dropdown from facilities)
- Shift tag (optional, dropdown from recent shifts at selected clinic)
- Receipt upload (camera/file button)
- Each category shows a one-line tooltip explaining why it's deductible

### 4. `src/components/expenses/ExpenseSummaryTab.tsx`
Dashboard view:
- **3 summary cards**: YTD Total Expenses, YTD Deductible Total, Categories Tracked
- **Category breakdown**: card grid showing each category with YTD total and progress bar
- **Deductibility breakdown**: grouped by type (Schedule C, Above-the-line, Retirement, 50% meals)
- **"Export for CPA"** button → generates CSV with columns: Date, Category, Description, Amount, Deductible Amount, Deductibility Type, Clinic, Notes
- Date range and category filters

### 5. `src/hooks/useExpenses.ts`
Hook for CRUD operations, YTD aggregations, config loading/saving.

### 6. `src/lib/expenseCategories.ts`
Defines the full category taxonomy with:
- Category key, label, parent group, tooltip, default deductibility type
- IRS rate lookups
- Deductibility calculation logic

## Deductibility Auto-Calculation Rules

| Category | Type | Logic |
|----------|------|-------|
| Business Meals | `fifty_percent` | `deductible = amount * 0.5` |
| Health Insurance | `above_the_line` | `deductible = amount` (flagged Schedule 1) |
| SEP-IRA / Solo 401(k) | `retirement` | `deductible = amount` (tracked separately) |
| Home Office | `full` | Calculated from sqft × $5 (simplified method) |
| Everything else | `full` | `deductible = amount` |

## Integration with Existing Modules

1. **Deductions Tab (DeductionsTab.tsx)**: After expenses exist, the YTD amounts in deduction categories can optionally pull from actual expense totals instead of manual entry. We add a "Sync from expenses" indicator.

2. **CPA Packet Tab**: The CSV export already includes deduction data. We enhance it to include itemized expense totals by category from the expenses table.

3. **Relief Deduction Guide**: No changes needed — it remains the educational/planning layer.

4. **Dashboard**: Add an optional "Recent expenses" or "Log expense" quick action.

## Files to Create/Modify

**New files (6):**
- `src/lib/expenseCategories.ts` — category taxonomy + deductibility logic
- `src/hooks/useExpenses.ts` — CRUD hook
- `src/pages/ExpensesPage.tsx` — top-level page
- `src/components/expenses/ExpenseLogTab.tsx` — transaction list
- `src/components/expenses/AddExpenseDialog.tsx` — entry form
- `src/components/expenses/ExpenseSummaryTab.tsx` — dashboard + export

**Modified files (3):**
- `src/pages/BusinessPage.tsx` — add Expenses tab
- `src/components/dashboard/QuickActions.tsx` — add "Log Expense" action
- `src/components/tax-strategy/CPAPacketTab.tsx` — include expense totals in export

**Database:**
- Migration: create `expenses` table, `expense_config` table, RLS policies
- Storage: create `expense-receipts` bucket

