

# S-Corp & 1099 Entity-Aware Tax Calculations

## Problem

Three issues with how entity type flows through the system:

1. **S-Corp `calculateTax()` excludes payroll tax from `totalAnnualTax`** — line 113 only sums `federalTax + personalStateTax`, omitting employer+employee FICA on salary. The payroll tax is computed (line 92) but never added. Users see an artificially low quarterly estimate.

2. **Tax Strategy engine ignores entity type** — `buildStrategies()` and `getCombinedMarginalRate()` always add 15.3% SE tax rate, even for S-Corp users who pay FICA only on salary. The S-Corp strategy card shows "switch to S-Corp" savings even when the user is already S-Corp.

3. **`useTaxStrategies` hardcodes filing status** — line 73 uses `'single'` and `0.05` state rate instead of reading from the user's tax intelligence profile.

## Changes

### 1. Fix `calculateTax()` S-Corp path (TaxDashboard.tsx, ~line 113)

Include payroll taxes in total:
```
totalAnnualTax = federalTax + personalStateTax + employerFICA + employeeFICA
```
Both employer and employee FICA (each 7.65% of salary) are real tax obligations the user must plan for. The salary itself is not a "deduction" in the traditional sense — it's W-2 income taxed at the individual level. The payroll taxes on it are what matter for quarterly planning.

### 2. Update `getCombinedMarginalRate()` (taxStrategies.ts)

Accept an optional `entityType` parameter. For S-Corp, use FICA rate on salary portion instead of full SE tax rate:
```typescript
export function getCombinedMarginalRate(
  annualizedIncome: number,
  filingStatus: FilingStatus = 'single',
  stateRate: number = 0.05,
  entityType: string = 'sole_prop',
): number {
  const federalRate = getMarginalRate(annualizedIncome, filingStatus);
  // S-Corp: no SE tax on distributions, only FICA on salary
  const selfEmploymentComponent = entityType === 'scorp' ? 0 : SE_TAX_RATE;
  return federalRate + selfEmploymentComponent + stateRate;
}
```

### 3. Make `buildStrategies()` entity-aware (taxStrategies.ts)

- Accept `entityType` parameter
- **S-Corp users**: Hide the "S-Corp Election Analysis" strategy (they're already S-Corp). Instead, show a "Salary Optimization" variant that helps tune reasonable salary.
- **1099 users**: Show S-Corp strategy as-is (potential switch)
- **S-Corp users**: Retirement strategy calculations use salary as the base for Solo 401(k) employee deferral (since contributions come from W-2 income in S-Corp context)

### 4. Wire tax profile into `useTaxStrategies` hook

Replace hardcoded `'single'` / `0.05` with actual profile values:
```typescript
const { profile } = useTaxIntelligence();
const filingStatus = (profile?.filing_status || 'single') as FilingStatus;
const stateRate = profile?.state_code ? (STATE_TAX_DATA[profile.state_code]?.topRate || 0.05) : 0.05;
const entityType = profile?.entity_type || 'sole_prop';
```
Pass `entityType` through to `buildStrategies()`.

### 5. Update strategy descriptions for S-Corp context

For S-Corp users:
- SEP-IRA/Solo 401(k): Clarify that contributions are based on W-2 salary, not total business income
- Replace S-Corp card with "Reasonable Salary Optimization" — slider to tune salary vs distribution split
- Quarterly deadlines: Note that payroll taxes are separate from quarterly estimated payments

## File Changes

| File | Change |
|---|---|
| `src/components/tax-intelligence/TaxDashboard.tsx` | Fix S-Corp `calculateTax()` to include payroll tax in `totalAnnualTax` |
| `src/lib/taxStrategies.ts` | Add `entityType` param to `getCombinedMarginalRate()` and `buildStrategies()`. Swap S-Corp strategy for salary optimization when user is S-Corp. Adjust retirement calc descriptions. |
| `src/hooks/useTaxStrategies.ts` | Import `useTaxIntelligence`, read profile for filing status, state rate, and entity type. Pass to `buildStrategies()`. |
| `src/components/tax-strategies/StrategyCard.tsx` | Update S-Corp calculator section to show salary optimization UI when entity is already S-Corp |

No database changes needed — entity type is already stored in `tax_intelligence_profiles`.

