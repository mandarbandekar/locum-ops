

# Tax Estimator from Real Data

## What It Does

Replace the current "user picks a %" reserve approach with an actual tax estimator that computes estimated federal income tax + self-employment tax (15.3%) from the user's real paid invoice data — broken down by quarter, with a running "you should have set aside $X by now" indicator.

## Current State

- TrackerTab already pulls paid invoices via `aggregateQuarterlyIncome` and shows YTD income
- Reserve is a user-set flat % or fixed monthly amount — not a real estimate
- No self-employment tax (SE tax) calculation exists
- No filing status or standard deduction awareness

## Changes

### 1. Add tax estimation logic to `src/lib/taxCalculations.ts`

New exported functions:

- **`estimateSelfEmploymentTax(netIncome)`** — computes 92.35% × income × 15.3% (Social Security + Medicare), with the $168,600 SS wage cap for 2026
- **`estimateFederalIncomeTax(netIncome, filingStatus, deductionOverride?)`** — applies standard deduction based on filing status (single/married_joint/married_separate/head_of_household), then 2026 marginal brackets (10/12/22/24/32/35/37%)
- **`estimateQuarterlyPayments(annualTax, quarterlyIncome)`** — splits annual estimated liability proportionally by quarter income, returns per-quarter amounts
- **`estimateTotalTax(netIncome, filingStatus, deductionOverride?)`** — returns `{ federalIncome, selfEmployment, total, effectiveRate, quarterlyPayment }`

All functions are pure math with a disclaimer constant: these are planning estimates only.

### 2. Add a `TaxEstimatorCard` component

New file: `src/components/tax-strategy/TaxEstimatorCard.tsx`

A card shown above the quarterly planning section in TrackerTab that displays:

- **Filing status selector** (single, married filing jointly, married filing separately, head of household) — persisted to `tax_settings`
- **Business expense deduction** — optional override input so users can subtract known deductions from gross income before estimating (defaults to $0)
- **Computed results**:
  - Gross 1099 income (from paid invoices — already computed)
  - Deductible portion of SE tax (50% of SE tax)
  - Estimated SE tax
  - Estimated federal income tax
  - **Total estimated tax liability**
  - **Effective tax rate** (total / gross)
  - **Per-quarter payment** (total / 4, or proportional to income)
- **"vs. Your Reserve" comparison** — shows the delta between the user's current reserve setting and the estimated liability: "Your 30% reserve = $24,000. Estimated liability = $21,400. You're $2,600 ahead."

### 3. Update TrackerTab to integrate the estimator

In `src/components/tax-strategy/TrackerTab.tsx`:

- Import and render `TaxEstimatorCard` between the summary cards and the reserve preference card
- Add `filing_status` and `estimated_deductions` to the settings state (read/write from `tax_settings`)
- Pass quarterly income data + settings to the estimator card
- Update the quarterly cards to show "Estimated payment: $X" alongside the existing reserve amount

### 4. Update `tax_settings` table

Add two columns via migration:
- `filing_status` (text, default `'single'`)
- `estimated_deductions` (numeric, default `0`)

### 5. Update summary cards

Replace the "Est. Reserve" summary card with two rows:
- **Est. Tax Liability** (computed) — the real estimate
- **Your Reserve** (user-set) — kept for comparison

Add a small delta indicator: green if reserve >= liability, amber if under.

## Files to Modify

- `src/lib/taxCalculations.ts` — add SE tax, federal tax, and total estimate functions
- `src/components/tax-strategy/TaxEstimatorCard.tsx` — new component
- `src/components/tax-strategy/TrackerTab.tsx` — integrate estimator card, pass new settings
- `src/test/taxCalculations.test.ts` — add tests for new functions
- Database migration — add `filing_status` and `estimated_deductions` to `tax_settings`

## Disclaimer

Every computed number includes the existing disclaimer pattern: "Planning estimate only — confirm with your CPA." The estimator does not account for state taxes, credits, other income sources, or itemized deductions beyond the standard deduction.

