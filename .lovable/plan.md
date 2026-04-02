

# Simplify Estimated Tax Tracker

## What Changes

Remove the complex Tax Estimator card (filing status, SE tax, federal brackets, annualized installment table) and replace it with a simple 30%-default calculation: **Estimated Tax = YTD Income x Reserve %**.

The reserve percentage (default 30%) already exists as `set_aside_percent` in settings. We unify the concept: your reserve % IS your estimated tax rate.

## File Changes

### 1. Delete `src/components/tax-strategy/TaxEstimatorCard.tsx`
No longer needed.

### 2. Simplify `src/components/tax-strategy/TrackerTab.tsx`

**Remove:**
- Import of `TaxEstimatorCard`
- Imports of `estimateTotalTax`, `estimateQuarterlyInstallments`, `FilingStatus`
- `filing_status` and `estimated_deductions` from `TaxSettings` interface and state
- The `taxEstimate` and `estimatedQuarterly` useMemo calls
- The `<TaxEstimatorCard ... />` render block (lines 288-297)
- References to `eqp?.installmentPayment` in quarterly cards

**Simplify KPI strip:**
- "Paid Income YTD" — stays as-is
- "Est. Tax (30%)" — simply `totalIncome * (settings.set_aside_percent / 100)`, label shows the user's chosen %
- "Your Reserve" — stays, but the comparison is now against the simple estimate
- "Next Due" — stays

**Simplify Reserve Preference card:**
- Keep the percent/fixed toggle and save button
- Default percent = 30%
- Add a short note: "Most relief professionals set aside 25–35% for federal + state taxes. Adjust based on your CPA's recommendation."
- Remove filing status and deductions inputs

**Simplify quarterly cards:**
- Replace "Est. Payment" with a simple calculation: quarter's income × reserve %
- Keep Income, Reserve, status selector, checklist — all unchanged

**Add a simple status callout** below the KPI strip:
- If reserve ≥ estimate → green: "You're on track — your reserve covers your estimated taxes"
- If reserve < estimate → amber: "Your reserve is $X short of your estimated taxes — consider setting aside more"
- If no income → neutral: no callout

### 3. Update `src/pages/TaxStrategyPage.tsx`
No changes needed (already just renders TrackerTab).

## What Users See After

- Clean KPI strip: Income | Est. Tax (30%) | Reserve | Next Due
- A green/amber status bar showing if they're on track
- Simple reserve preference (% or fixed, default 30%)
- Quarterly cards with income, reserve, status, and checklist
- No confusing tax brackets, SE tax breakdowns, or annualized installment tables

