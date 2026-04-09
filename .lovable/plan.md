

# Fix Tax Strategy Curation for S-Corp vs 1099

## Problem
The tax **estimate engine** correctly differentiates S-Corp from 1099, but the **strategy engine** does not. All strategy savings calculations assume sole prop math (15.3% SE rate, SE-based retirement limits), producing inflated or incorrect numbers for S-Corp users.

## Changes

### 1. Pass `entityType` into `buildStrategies` and `getCombinedMarginalRate`

**File**: `src/lib/taxStrategies.ts`

- Add `entityType` parameter to `getCombinedMarginalRate()`. When `scorp`, use the effective FICA rate on salary portion instead of the full 15.3% SE rate.
- Add `entityType` and `scorpSalary` parameters to `buildStrategies()`.
- For S-Corp users:
  - Adjust `combinedRate` to reflect lower payroll tax burden
  - Recalculate retirement strategy limits using W-2 salary instead of SE net income
  - Update strategy descriptions/copy to reference S-Corp terms (Form 1120-S, W-2 salary) instead of sole prop terms (Schedule C, SE income)
  - Use actual `calculateTax` result for quarterly deadline payment estimate instead of `income * 0.3`

### 2. Update `useTaxStrategies` to pass entity context

**File**: `src/hooks/useTaxStrategies.ts`

- Pass `entityType` and `taxProfile?.scorp_salary` to `buildStrategies()` so strategies are computed with the correct tax treatment.

### 3. Update `TaxStrategiesTab` combined rate display

**File**: `src/components/tax-strategies/TaxStrategiesTab.tsx`

- Pass `entityType` when computing the displayed combined marginal rate so the banner shows the correct rate for S-Corp users.

### 4. Update `getTotalStrategySavings` helper

**File**: `src/lib/taxStrategies.ts`

- Pass `entityType` and `scorpSalary` through to `buildStrategies` so the "With strategies applied" comparison card in TaxDashboard also uses correct S-Corp math.

## Scope

| File | Change |
|---|---|
| `src/lib/taxStrategies.ts` | Add entity-aware rate calc, retirement math, and copy |
| `src/hooks/useTaxStrategies.ts` | Pass entity type and salary to strategy builder |
| `src/components/tax-strategies/TaxStrategiesTab.tsx` | Pass entity type to combined rate display |

No database changes needed.

