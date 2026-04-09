

# Tax Projection Engine Integration

## Summary

Replace the current income calculation (YTD paid + 90-day projected shifts) with a full-year projection engine supporting three methods: **Annualized Actual**, **Annual Goal**, and **Safe Harbor**. Add projection method selection to the tax profile, wire the new engine into the dashboard and shift nudge, replace the shift-count gate on Tax Strategy with a profile-completion gate, and add early-year handling.

## Database Migration

Add 3 new columns to `tax_intelligence_profiles`:

```sql
ALTER TABLE tax_intelligence_profiles
  ADD COLUMN IF NOT EXISTS projection_method text NOT NULL DEFAULT 'annualized_actual',
  ADD COLUMN IF NOT EXISTS annual_income_goal numeric DEFAULT 0,
  ADD COLUMN IF NOT EXISTS prior_year_total_income numeric DEFAULT 0;
```

No new tables. The `prior_year_tax_paid` column already exists and serves safe harbor.

## New File: `src/lib/taxProjectionEngine.ts`

Core projection logic — pure functions, no React:

- **`assembleProjectedAnnualIncome(profile, earnedYTD, upcomingShiftIncome)`** — returns `{ method, annualIncome, bypassCalculation, earlyYearFallback, note, ytdEarned, bookedUpcoming, annualizedPace, yearFraction }`
  - `annualized_actual`: annualizes YTD pace after 2 months; before that, falls back to `annual_income_goal` or `prior_year_total_income`
  - `annual_projection`: uses `annual_income_goal` directly
  - `safe_harbor`: returns `{ bypassCalculation: true }` — quarterly payment = `prior_year_tax_paid / 4`

- **`getSafeHarborEstimate(profile)`** — returns quarterly payment from prior year tax (100% method for >$150k, else 100%)

- **`getFullQuarterlyEstimate(profile, earnedYTD, upcomingShiftIncome, expenseOverride)`** — orchestrator that runs all three methods through `calculateTax()`, returns `{ activeMethod, activeEstimate, methods: { safeHarbor, annualGoal, annualizedActual }, spread, spreadSeverity, projectionMeta }`

- **`PROJECTION_CONFIG`** — constants: `minMonthsForAnnualization: 2`

## File Changes

| File | Change |
|---|---|
| `src/lib/taxProjectionEngine.ts` | **Create** — projection engine with 3 methods + orchestrator |
| `src/hooks/useTaxIntelligence.ts` | Add `projection_method`, `annual_income_goal`, `prior_year_total_income` to `TaxIntelligenceProfile` interface and `mapRow()` |
| `src/components/tax-intelligence/TaxDashboard.tsx` | Replace inline income calc (lines 201-218) with `getFullQuarterlyEstimate()`. Add method badge below hero amount. Add projection check row in breakdown. Add spread disclosure when severity is medium/high. Update "No Income" gate to show early-year banner with CTAs when `earlyYearFallback` is true. |
| `src/components/tax-intelligence/TaxProfileSetup.tsx` | Add a new "Projection Method" step: radio group for annualized actual / annual goal / safe harbor. Show income goal input when `annual_projection` selected. Show prior year income input when relevant. Wire to save. |
| `src/components/tax-strategies/TaxStrategiesTab.tsx` | Replace 4-shift gate with tax profile completion gate (entity_type + filing_status + state_code required). Show strategies immediately after profile setup regardless of shift count. |
| `src/lib/taxNudge.ts` | Update `computeEffectiveSetAsideRate()` to accept projected annual income from the active estimate rather than raw `paidYTD + 90day` |
| `src/lib/taxConstants2026.ts` | Add metadata comments noting data source (Rev. Proc. 2025-32) and next review date. Values stay as-is (already 2026 projected). |

## Dashboard UX Additions

**Method badge** (below quarterly payment hero):
```
$4,200 / quarter
Based on current pace  ·  [change method]
```
The `[change method]` link opens the projection method selector inline (small popover, not a new page).

**Projection comparison row** (in the "How We Calculate This" card):
```
Annual goal:     $180,000
Current pace:    $194,000  (+8%)
Active method:   Annualized actual
```

**Spread disclosure** (when spread > 25%):
```
Your three estimate methods range from $3,900 to $5,100. 
Consider reviewing with your CPA this quarter.
```

**Early year banner** (Jan-Feb, no prior year data, no goal):
```
It's early in the tax year — limited shift data available.
[Enter last year's tax bill →]  [Set an income goal →]
We'll improve the estimate as you log more shifts.
```
The estimate still shows using fallback — just with transparent labeling.

## Tax Strategy Gate Change

Replace:
```typescript
if (paidShiftCount < 4) return <LockedState />
```
With:
```typescript
const profileComplete = hasProfile && profile?.entity_type && profile?.filing_status && profile?.state_code;
if (!profileComplete) return <CompleteProfileState />
```
Users with a complete tax profile see strategies immediately, even with zero shifts. Shift data enriches content but doesn't gate access.

## Technical Details

- `calculateTax()` function is **unchanged** — it already accepts `grossIncome` as a parameter. The projection engine just changes what value gets passed in.
- The `TaxDashboard` component replaces its inline `earnedIncome + projectedIncome` calc with a call to `getFullQuarterlyEstimate()` which internally calls the same `calculateTax()`.
- Safe harbor method bypasses `calculateTax()` entirely — quarterly payment = `prior_year_tax_paid * (safe_harbor_method === '110_percent' ? 1.1 : 1.0) / 4`.
- The shift nudge in `taxNudge.ts` uses the active estimate's effective rate rather than recalculating from raw income.

