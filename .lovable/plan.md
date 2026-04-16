

## Plan: Redesign /expenses Page

### Summary
Replace the category tile grid with a single "Log Expense" button + bottom sheet, change the hero metric to "Estimated Tax Savings YTD", and restructure the tab layout so Mileage is its own dedicated tab with confirmed-by-default entries.

### Changes

**1. `src/pages/ExpensesPage.tsx`** — Restructure tabs
- Keep 3 tabs but rename: **Expenses** (was "Expense Tracker"), **Mileage** (unchanged), **Write-Off Summary** (unchanged)
- Import `useTaxIntelligence` to get `taxProfile` for marginal rate calculation
- Pass `taxProfile` down to `ExpenseLogTab` for the hero card calculation

**2. `src/components/expenses/ExpenseLogTab.tsx`** — Major rework of the Expense Tracker tab
- **Remove** `ExpenseCategoryGrid` import and rendering (the 9 category tiles)
- **Remove** mileage-related UI from this tab: `MileageReviewBanner`, `MileageBackfillCard`, mileage setup status card — all move to the Mileage tab exclusively
- **Replace hero stats**: Change "YTD Write-Offs" card to **"Estimated Tax Savings YTD"** calculated as `ytdDeductibleCents × marginalRate`. Marginal rate comes from the user's tax profile via `getCombinedMarginalRate()` (uses filing status, entity type, state), defaulting to 24% if no profile exists.
- **Add primary "Log Expense" button** at the top (prominent, full-width-ish) that opens a `Drawer` (bottom sheet) with three options:
  - **Snap Receipt** — shows `toast.info('Coming soon')` on tap
  - **Upload Statement** — shows `toast.info('Coming soon')` on tap
  - **Enter Manually** — opens the existing `AddExpenseDialog`
- Keep the existing expense log list below with search/filter
- Keep IRS Receipt Reminder alert
- Remove the secondary "Log Expense Manually" button (replaced by the primary one)

**3. Create `src/components/expenses/LogExpenseSheet.tsx`** — New bottom sheet component
- Uses the `Drawer` component (already exists in ui/drawer.tsx)
- Three option cards: Snap Receipt (Camera icon), Upload Statement (FileUp icon), Enter Manually (PenLine icon)
- First two show "Coming soon" badge and trigger a toast
- Third opens the AddExpenseDialog via callback

**4. `src/components/expenses/MileageTrackerTab.tsx`** — Minor: confirmed-by-default
- Change new auto-mileage entries to default to `confirmed` status (this is a hook-level change)
- Tab already has its own setup status, backfill, review, and confirmed log — no structural changes needed

**5. `src/hooks/useExpenses.ts`** — No changes needed for confirmed-by-default
- The `mileage_status` default is set at the edge function (`auto-mileage-tracker`) level. For the UI, the Mileage tab already shows confirmed entries. The "confirmed by default" behavior means we treat auto-generated entries as confirmed unless the user disputes — this is a display-level change in `MileageTrackerTab` where we skip the draft review step and show all mileage as confirmed with an option to dispute.

### Hero Card Calculation
```typescript
// In ExpenseLogTab
import { getCombinedMarginalRate, getAnnualizedIncome } from '@/lib/taxStrategies';

const marginalRate = taxProfile?.setup_completed_at
  ? getCombinedMarginalRate(
      annualizedIncome,
      taxProfile.filing_status as FilingStatus,
      stateRate,
      taxProfile.entity_type,
      taxProfile.scorp_salary
    )
  : 0.24; // default 24%

const estimatedTaxSavingsCents = Math.round(ytdDeductibleCents * marginalRate);
```

### Files modified
- `src/pages/ExpensesPage.tsx`
- `src/components/expenses/ExpenseLogTab.tsx`
- `src/components/expenses/LogExpenseSheet.tsx` (new)
- `src/components/expenses/MileageTrackerTab.tsx`

