

# Tax Strategy Guidance Engine

## Summary

Build a comprehensive tax strategy system with 7 personalized strategies, accessible as a new tab ("Tax Strategies") between "Tax Estimate" and "CPA Prep" in the Tax Center, plus a summary card on the Dashboard. All calculations use existing `taxConstants2026.ts` infrastructure. User inputs persist to a new database table.

## Database

### New table: `tax_strategy_inputs`

| Column | Type | Default |
|---|---|---|
| id | uuid | gen_random_uuid() |
| user_id | uuid | auth.uid() |
| deduction_checklist | jsonb | '{}' (maps item key → dollar amount) |
| home_office_sqft | integer | 0 |
| weekly_business_miles | numeric | 0 |
| retirement_vehicle | text | 'sep_ira' |
| retirement_contribution_slider | numeric | 0 |
| scorp_salary_slider | numeric | 110000 |
| prior_year_tax | numeric | 0 |
| dismissed_strategies | text[] | '{}' |
| created_at | timestamptz | now() |
| updated_at | timestamptz | now() |

RLS: `auth.uid() = user_id` for ALL operations. One row per user, upsert pattern.

## New Files

### `src/lib/taxStrategies.ts` — Pure calculation engine

Exports strategy definitions and calculation functions:

- **7 strategy configs**: each with `id`, `title`, `description`, `threshold` function, `calculateSavings` function, `incomeUnlockLabel`
- **`getAnnualizedIncome(shifts, invoices)`**: total paid income ÷ weeks worked × 52
- **`getMarginalRate(annualizedIncome, filingStatus, stateRate)`**: federal marginal + SE rate (15.3% where applicable) + state rate (from profile or default 5%)
- **Strategy calculations**:
  1. Vet Deductions: sum of checked items × combined marginal rate
  2. Home Office: min(sqft × $5, $1500) × marginal rate
  3. Mileage: annual miles × $0.725 × marginal rate (auto-estimate from facility count × 25mi roundtrip × shift frequency if available)
  4. SEP-IRA: min(net SE income × 0.9235 × 0.25, $72,000) × marginal rate
  5. Solo 401(k) vs SEP-IRA: delta between solo 401k max ($23,500 + employer 25%) and SEP max
  6. S-Corp Election: SE tax saved on distributions minus $2,500 overhead
  7. Quarterly Deadlines: next deadline countdown + recommended payment amount

### `src/hooks/useTaxStrategies.ts` — Data hook

- Loads/saves `tax_strategy_inputs` row via Supabase
- Computes annualized income from `useData()` shifts/invoices
- Computes all strategy results using the calculation engine
- Exposes: `strategies`, `totalSavings`, `annualizedIncome`, `inputs`, `updateInputs`, `dismissStrategy`, `loading`
- Demo mode returns mock data

### `src/components/tax-strategies/TaxStrategiesTab.tsx` — Main tab component

- Header with annualized income subtitle and total savings banner
- Disclaimer banner (amber, educational not advice)
- Vertical list of `StrategyCard` components
- "4 shifts required" gate: if fewer than 4 paid shifts, show encouragement card instead

### `src/components/tax-strategies/StrategyCard.tsx` — Individual strategy card

- Collapsed: status dot (green/gray/blue), title, one-line description, savings badge, unlock threshold tag
- Expanded (accordion): "Why this matters" (personalized copy with income), "How it works" bullets, estimated savings, action steps, dismiss button
- For interactive strategies (deductions checklist, home office slider, mileage input, retirement slider, S-Corp salary slider), render inline calculators that update in real-time
- Strategy 5 (Solo 401k vs SEP) renders a side-by-side comparison table
- Strategy 7 (Quarterly Deadlines) renders countdown + payment amount

### `src/components/tax-strategies/DeductionChecklist.tsx` — Strategy 1 interactive checklist

8 vet-specific items with editable dollar amounts, running total, and tax savings calculation

## Modified Files

### `src/pages/TaxCenterPage.tsx`
- Add third tab button "Tax Strategies" (with `Lightbulb` icon) between Tax Estimate and CPA Prep
- Import and render `TaxStrategiesTab` when `tab === 'tax-strategies'`
- Update subtitle to mention strategies

### `src/pages/DashboardPage.tsx`
- Add a "Tax Savings Opportunities" card in the Needs Attention or as a standalone card
- Shows total potential savings and strategy count
- Gate: only show if 4+ paid shifts logged; otherwise show "Log 4 shifts to unlock tax strategies"
- CTA navigates to `/tax-center?tab=tax-strategies`

### `src/App.tsx`
- Add redirect: `/tax-strategies` → `/tax-center?tab=tax-strategies`

## Calculation Details

All strategies use `getMarginalRate` from `taxConstants2026.ts` for federal brackets. Combined rate = federal marginal + 15.3% SE (for sole props) + state rate from user's tax profile.

The `$0.725/mile` rate comes from `TAX_YEAR_CONFIG.standardMileageRate`. The `$72,000` SEP/401k cap from `RETIREMENT_LIMITS`. S-Corp calculations reuse `estimateTotalTaxSCorp` from `taxCalculations.ts`.

## File Summary

| File | Action |
|---|---|
| `src/lib/taxStrategies.ts` | Create |
| `src/hooks/useTaxStrategies.ts` | Create |
| `src/components/tax-strategies/TaxStrategiesTab.tsx` | Create |
| `src/components/tax-strategies/StrategyCard.tsx` | Create |
| `src/components/tax-strategies/DeductionChecklist.tsx` | Create |
| `src/pages/TaxCenterPage.tsx` | Update — add tab |
| `src/pages/DashboardPage.tsx` | Update — add savings card |
| `src/App.tsx` | Update — add redirect |
| Migration | Create `tax_strategy_inputs` table with RLS |

