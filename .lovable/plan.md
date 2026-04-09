

# Improve Tax Income Calculation Model

## Summary

Replace the current "paid invoices + 90-day shift projection" model with a richer three-source income calculation that provides full-year visibility, and add a "prior year income" question to the Tax Profile Setup wizard.

## Current State

- **Earned income**: Sum of paid invoices this year — correct
- **Projected income**: Only looks at shifts in the next 90 days — too narrow, misses rest of year
- **No prior year context**: The DB has `prior_year_total_income` and `projection_method` columns on `tax_intelligence_profiles` but neither is used in the UI or calculations
- **No annual estimation**: Users who are early in the year see artificially low estimates

## New Income Model

Three components, clearly labeled in the UI:

```text
Total Estimated Annual Income =
  (1) YTD Earned (paid invoices)
  + (2) Upcoming Scheduled (all future shifts this year with rates)
  + (3) Projected Remainder (estimate for unscheduled months)
```

**Projected Remainder** uses one of two methods:
- **Prior year baseline** (preferred): If user entered prior year income, calculate remaining months' income as `(prior_year_income / 12) × remaining_unscheduled_months`
- **Pace-based fallback**: If no prior year data, annualize current pace: `(YTD earned / months_elapsed) × remaining_unscheduled_months`

A month counts as "scheduled" if it has any future shifts. Remaining unscheduled months = months left in year minus months with scheduled shifts.

## Changes

### 1. Tax Profile Setup — Add "Prior Year Income" step

**File**: `src/components/tax-intelligence/TaxProfileSetup.tsx`

- Add a new step after "expenses" and before "safeHarbor" called `priorYearIncome`
- Question: "How much 1099 income did you earn last year?" with a dollar input
- Helper text: "This helps us project your full-year income more accurately, especially early in the year. Skip if you're new to relief work."
- Allow $0 / skip — it's optional
- Save to `prior_year_total_income` field

### 2. Tax Intelligence Profile — Add missing field

**File**: `src/hooks/useTaxIntelligence.ts`

- Add `prior_year_total_income: number` to the `TaxIntelligenceProfile` interface
- Map it in `mapRow` and include in `DEMO_PROFILE` (default: 120000 for demo)

### 3. TaxDashboard — New income calculation

**File**: `src/components/tax-intelligence/TaxDashboard.tsx`

Replace the current `earnedIncome + projectedIncome` with three-part model:

```typescript
// (1) YTD Earned — paid invoices this year (unchanged)
const earnedIncome = ...;

// (2) Upcoming Scheduled — ALL future shifts this year (not just 90 days)
const scheduledIncome = shifts
  .filter(s => {
    const d = new Date(s.start_datetime);
    return d > now && d.getFullYear() === currentYear;
  })
  .reduce((sum, s) => sum + (s.rate_applied || 0), 0);

// (3) Projected Remainder — fill unscheduled months
const monthsElapsed = now.getMonth(); // 0-indexed = months completed
const scheduledMonths = new Set(futureShifts.map(s => new Date(s.start_datetime).getMonth()));
const remainingUnscheduledMonths = Array.from({length: 12}, (_, i) => i)
  .filter(m => m > now.getMonth() && !scheduledMonths.has(m)).length;

let projectedRemainder = 0;
if (profile.prior_year_total_income > 0) {
  projectedRemainder = (profile.prior_year_total_income / 12) * remainingUnscheduledMonths;
} else if (monthsElapsed > 0 && earnedIncome > 0) {
  projectedRemainder = (earnedIncome / monthsElapsed) * remainingUnscheduledMonths;
}

const totalIncome = earnedIncome + scheduledIncome + projectedRemainder;
```

### 4. UI — Show income breakdown transparently

In the KPI tooltip and a new "Income Breakdown" section, show:
- "YTD Earned: $X (paid invoices)"
- "Scheduled Shifts: $Y (upcoming this year)"  
- "Projected: $Z (based on [prior year / current pace])"
- Source indicator: "Based on your 2025 income of $X" or "Based on your year-to-date pace"

### 5. Update income gate

Change `hasAnyIncome` check to also consider `prior_year_total_income > 0` so users who set up their profile early in the year (before any paid invoices) still see estimates.

## File Changes

| File | Change |
|---|---|
| `src/hooks/useTaxIntelligence.ts` | Add `prior_year_total_income` to interface, mapRow, demo profile |
| `src/components/tax-intelligence/TaxProfileSetup.tsx` | Add prior year income step |
| `src/components/tax-intelligence/TaxDashboard.tsx` | New 3-part income model, updated tooltips, income breakdown display |

No database changes — `prior_year_total_income` column already exists.

