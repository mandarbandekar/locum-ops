

# Tax Estimate V1 Rewrite — 2025 Tax Year

## Summary

Complete rewrite of the tax estimation engine per the user's detailed spec. Replace the current 2026-projected, multi-source income model with a simpler, user-input-driven 2025 tax calculator. Two clean paths: **1099/LLC** and **S-Corp**. The goal shifts from "project income from invoices/shifts" to "user tells us their expected annual income and we calculate quarterly 1040-ES payments."

## What changes fundamentally

1. **Income source**: Currently derived from paid invoices + scheduled shifts + projections. New model: user enters `annualReliefIncome` directly in the profile setup. No more 3-part income model.
2. **Tax year**: 2026 projected → **2025 actual published rates**
3. **S-Corp path**: Add withholding tracking (salary withholding, extra withholding, spouse withholding) so quarterly estimate = only what's NOT already covered by payroll
4. **State tax**: Simplify from 50-state progressive brackets to flat rates for most states, with full brackets only for CA and NY
5. **Remove V2 features**: PTE elections, safe harbor method, annualized installment method, spouse SE income — all explicitly out of scope for V1
6. **New disclaimer**: Standardized, plain-language disclaimer on every estimate screen

## Database migration

Add new columns to `tax_intelligence_profiles`:
- `annual_relief_income numeric DEFAULT 0` — user's expected gross income
- `extra_withholding numeric DEFAULT 0` — S-Corp: extra $ withheld per paycheck
- `pay_periods_per_year integer DEFAULT 24` — S-Corp: pay frequency
- `annual_business_expenses numeric DEFAULT 0` — replaces `ytd_expenses_estimate` semantically

Existing columns reused: `entity_type`, `filing_status`, `state_code`, `scorp_salary`, `spouse_w2_income`, `retirement_contribution`

Columns no longer used in V1 (keep in DB, ignore in code): `pte_elected`, `spouse_has_se_income`, `spouse_se_net_income`, `safe_harbor_method`, `prior_year_tax_paid`, `prior_year_total_income`, `other_w2_income`, `expense_tracking_level`

## File changes

### New files

| File | Purpose |
|---|---|
| `src/lib/taxConstantsV1.ts` | 2025 tax constants — brackets, rates, state data. Single source of truth. |
| `src/lib/taxCalculatorV1.ts` | Pure calculation engine: `calculate1099Tax()`, `calculateSCorpTax()`, `calculateTax()`. No UI, no hooks. |

### Modified files

| File | Change |
|---|---|
| `src/hooks/useTaxIntelligence.ts` | Add new fields to interface + mapRow + demo profile |
| `src/components/tax-intelligence/TaxProfileSetup.tsx` | Rewrite to 6-step flow per spec: Entity → Income → Filing/Household → Retirement → State → S-Corp Withholding. Show live K-1 distribution for S-Corp. MFJ spouse income required validation. |
| `src/components/tax-intelligence/TaxDashboard.tsx` | Replace `calculateTax` with V1 engine. Remove 3-part income model (use `profile.annual_relief_income` directly). Rewrite results display per spec: transparent math breakdown, S-Corp P&L section, withholding credit display. Update disclaimer. |
| `src/lib/taxNudge.ts` | Update imports to use V1 calculator and constants. Update `setAsideRate` from V1 result. |
| `src/lib/taxStrategies.ts` | Update imports to V1 constants. Adjust `getCombinedMarginalRate` to use V1 rates. |
| `src/hooks/useTaxStrategies.ts` | Update FilingStatus import to V1 |
| `src/components/tax-strategies/TaxStrategiesTab.tsx` | Update state data import |
| `src/components/tax-strategies/StrategyCard.tsx` | Update constants import |
| `src/lib/taxPaymentLinks.ts` | Update quarterly due dates import |
| `src/lib/reminderEngine.ts` | Update quarterly due dates import |
| `src/pages/DashboardPage.tsx` | Update calculateTax import to V1 |
| `src/components/schedule/ShiftTaxNudge.tsx` | Per-shift nudge using `setAsideRate` from V1 result |

### Kept but deprecated

| File | Status |
|---|---|
| `src/lib/taxConstants2026.ts` | Keep temporarily — other files still import `US_STATES`, `RETIREMENT_LIMITS`. Will re-export from V1 or update imports. |
| `src/lib/stateTaxData.ts` | Replaced by state data in `taxConstantsV1.ts`. Keep file, remove usage. |
| `src/lib/taxCalculations.ts` | Old quarterly tracker math — unrelated to V1 estimate, keep as-is for TrackerTab. |

## Calculation engine detail

### 1099 path
1. Net income = gross − expenses
2. SE tax = (net × 0.9235) applied to SS (12.4%, capped at $176,100) + Medicare (2.9%) + Additional Medicare (0.9% above threshold)
3. SE deduction = SE tax × 0.5
4. AGI = net − SE deduction − retirement + spouse W2
5. Federal taxable = AGI − standard deduction
6. Federal tax via brackets; subtract spouse's bracket share
7. State tax on net income
8. Annual 1040-ES = federal + state + SE − spouse withholding estimate
9. Quarterly = annual / 4

### S-Corp path
1. Distribution = revenue − expenses − salary − employer FICA (7.65%)
2. AGI = salary + distribution − retirement + spouse W2
3. Federal taxable = AGI − standard deduction
4. Federal tax via brackets
5. State tax on salary + distribution
6. Withholding credits: salary federal withholding (marginal rate × salary) + salary state withholding + extra withholding + spouse withholding
7. Annual 1040-ES = federal + state − total withholding
8. Quarterly = annual / 4

### Per-shift nudge
`setAsideRate = marginal federal + effective state rate + SE component (1099 only)`, capped at 50%

## Setup flow (6 steps)

1. **Entity type** — 1099 vs S-Corp with helper text
2. **Income** — Gross income + expenses (1099) or Revenue + salary + expenses with live K-1 calc (S-Corp)
3. **Filing status + household** — Single/MFJ/HOH. MFJ requires spouse W2 (validated). No spouse SE in V1.
4. **Retirement** — Dollar amount, skip option, dynamic savings preview
5. **State** — Dropdown, immediate tax preview after selection
6. **S-Corp withholding** (S-Corp only) — Extra withholding per paycheck + pay periods

## Explicitly NOT in V1

Per the spec, these are excluded: safe harbor, annualized projection engine, PTE, QBI, AMT, progressive state brackets beyond CA/NY, spouse SE income, multi-state, itemized deductions, payment logging/history, variance tracker, annual reset.

