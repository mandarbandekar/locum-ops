

# S-Corp Aware Tax Estimates

## Problem

Currently, the tax estimate always calculates as a sole proprietor — applying 15.3% SE tax on all net income. If a user has selected S-Corp as their entity type (in the Tax Advisor profile's `entity_type` field) or selected "Already an S-Corp" in the S-Corp Explorer assessment, the estimates should reflect S-Corp tax treatment where only a "reasonable salary" portion is subject to payroll taxes.

## What Changes

### 1. New S-Corp tax estimation function in `taxCalculations.ts`

Add `estimateTotalTaxSCorp()` that:
- Takes gross income, filing status, business deductions, and a reasonable salary amount
- Applies payroll tax (7.65% employer-side FICA) only on the salary portion instead of 15.3% SE tax on all income
- Calculates federal income tax on net income (after deducting employer FICA share)
- Returns the same `TaxEstimate` shape plus an `sCorpSavings` field showing the difference vs sole prop

Add a helper `getDefaultReasonableSalary(grossIncome)` that picks a sensible default salary (~60% of income, capped) for display purposes, with a note to confirm with CPA.

### 2. Pass entity type into TrackerTab

- `TaxEstimateTab` reads `profile.entity_type` and `scorpResult?.answers?.currentEntity` to determine if the user is S-Corp
- Passes `isScorp` boolean and a `reasonableSalary` value down to `TrackerTab` as new props

### 3. Update TrackerTab to show S-Corp adjusted numbers

- When `isScorp` is true, use `estimateTotalTaxSCorp()` instead of `estimateTotalTax()`
- Show a badge/indicator "S-Corp" next to the Tax Snapshot header
- Replace "SE Tax" card with "Payroll Tax (on salary)" showing the reduced amount
- Add a "Savings vs Sole Prop" callout showing the estimated tax difference
- Add a small editable "Reasonable Salary" input so users can adjust the salary assumption
- Update the quarterly installments to use S-Corp figures
- Update the "Filing as single" subtitle to also say "· S-Corp" when applicable

### 4. Detection logic

Priority order for determining S-Corp status:
1. `profile.entity_type === 'scorp'` (set in IntakeCard/settings)
2. `scorpResult?.answers?.currentEntity === 'scorp'` (set in S-Corp Explorer)

## Files to Change

| File | Change |
|------|--------|
| `src/lib/taxCalculations.ts` | Add `estimateTotalTaxSCorp()` and `getDefaultReasonableSalary()` |
| `src/components/business/TaxEstimateTab.tsx` | Detect S-Corp status, pass `isScorp` and `reasonableSalary` to TrackerTab |
| `src/components/tax-strategy/TrackerTab.tsx` | Accept S-Corp props, conditionally use S-Corp estimator, show adjusted UI |

## Technical Details

S-Corp tax calculation logic:
- **Payroll taxes**: Salary × 7.65% (employer FICA) + Salary × 7.65% (employee FICA) = Salary × 15.3%
- **Key difference from sole prop**: Only the salary portion is subject to payroll tax, not all net income
- **Distribution**: (Net income - salary) flows as distribution, subject only to income tax
- **Federal income tax**: Computed on full net income minus employer FICA deduction (similar to SE deductible half)
- The reasonable salary defaults to ~60% of net income, clamped between $40K–$120K

