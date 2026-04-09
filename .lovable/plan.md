

# Tax Intelligence Module — Data Integration Audit & Fix

## Issues Found

### Issue 1: Expense data inconsistency across components

**`calculateTax()` (line 83)** uses `expenseOverride ?? profile.ytd_expenses_estimate` — a manually entered estimate from the profile. The dashboard (line 316) correctly computes `blendedExpenses = Math.max(actualExpenses, profile.ytd_expenses_estimate)` and passes it as `expenseOverride`. This is working correctly for the dashboard.

**`TaxReductionGuide` (line 54)** computes its own `netForCalc` using `profile.ytd_expenses_estimate` directly, **ignoring actual logged expenses** even though it fetches them on line 44-49. The `loggedExpenseTotal` is computed but only used for the "projected expenses" display — not for the actual tax bracket calculation.

**Tax Strategy `buildStrategies()`** does not receive or use any expense data at all. The `annualizedIncome` from `getAnnualizedIncome()` is gross income — no expenses are subtracted. Strategy savings calculations use gross income as the base, which overstates savings.

### Issue 2: Dashboard `taxSnapshot` ignores expenses entirely

`DashboardPage.tsx` line 554-567 calculates `taxSnapshot` by calling `calculateTax(annualized, taxProfile)` **without any expense override**. This means it falls back to `profile.ytd_expenses_estimate`, which may be stale or zero. It should use actual logged expenses.

### Issue 3: `TaxReductionGuide` duplicates tax math instead of using `calculateTax()`

Lines 54-62 manually recompute SE tax, AGI, and taxable income instead of calling the shared `calculateTax()` function. This creates drift risk and currently produces different results.

### Issue 4: Strategy `getAnnualizedIncome()` only uses paid invoices

`getAnnualizedIncome()` in `taxStrategies.ts` uses only paid invoice totals. This is consistent with the rest of the system (good), but the strategy savings calculations don't factor in expenses at all — overstating potential deduction savings.

## Changes

### 1. Fix `TaxReductionGuide` to use actual expenses and `calculateTax()`

Replace the manual tax math (lines 54-62) with a call to `calculateTax(ytdPaidIncome, profile, blendedExpenses)` where `blendedExpenses = Math.max(loggedExpenseTotal, profile.ytd_expenses_estimate)`. This ensures the reduction guide uses the same calculation engine and real expense data.

### 2. Fix Dashboard `taxSnapshot` to include expenses

Import `useExpenses()` in `DashboardPage` (it may already be available) and pass `blendedExpenses` to `calculateTax()` when computing the tax snapshot.

### 3. Pass expenses into Tax Strategy engine

- Add an `expenses` parameter to `buildStrategies()` and `getCombinedMarginalRate()`
- In `useTaxStrategies`, import `useExpenses()`, compute `blendedExpenses`, and pass net income (annualized income minus annualized expenses) where appropriate
- Strategy savings calculations should use net income for deduction impact calculations

### 4. Ensure mileage deductions are included

Mileage expenses are already stored in the `expenses` table with `deductible_amount_cents`. The `useExpenses()` hook's `ytdDeductibleCents` already includes confirmed mileage. No additional work needed — fixing the expense passthrough in issues 1-3 automatically includes mileage.

## File Changes

| File | Change |
|---|---|
| `src/components/tax-intelligence/TaxReductionGuide.tsx` | Replace manual tax math with `calculateTax()` call using blended expenses |
| `src/pages/DashboardPage.tsx` | Pass actual expenses to `calculateTax()` in `taxSnapshot` computation |
| `src/lib/taxStrategies.ts` | Add `businessExpenses` param to `buildStrategies()`, use net income for savings calcs |
| `src/hooks/useTaxStrategies.ts` | Import `useExpenses()`, compute blended expenses, pass to `buildStrategies()` |

No database changes needed. All expense and mileage data is already in the `expenses` table and accessible via `useExpenses()`.

