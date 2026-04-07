

# Redesign Tax Estimate Module — Tax Intelligence System

## Summary

Replace the current Tax Estimate tab with a three-section Tax Intelligence module: a multi-step Tax Profile Setup, a live Tax Dashboard, and a Tax Reduction Guide. The setup flow gates the dashboard; the guide is educational content tailored to the user's profile.

## Current State

- **TrackerTab.tsx** (~700 lines): Monolithic component with tax snapshot hero, quarterly payment guide, reserve settings, and readiness checklist. Uses only paid invoices and hardcodes `filingStatus: 'single'` with no profile-driven inputs.
- **TaxEstimateTab.tsx**: Wrapper that embeds TrackerTab + collapsible Ask Advisor + S-Corp Explorer.
- **taxCalculations.ts**: Core math library — SE tax, federal brackets, S-Corp estimates, quarterly installments. Already supports filing status, deductions, and S-Corp salary. This is mostly reusable.
- **DB tables**: `tax_settings` (set-aside prefs + filing_status + estimated_deductions), `tax_quarter_statuses`, `tax_checklist_items`, `tax_advisor_profiles`, `tax_profiles` (from GuidanceTab).
- **GuidanceTab.tsx**: Existing educational content with entity basics, CPA checker, concept cards.

## Architecture

```text
TaxCenterPage (tab = tax-estimate)
  └─ TaxEstimateTab
       ├─ TaxProfileSetup (modal/inline — 8-step wizard)
       │    └─ Persists to tax_intelligence_profiles table
       ├─ TaxDashboard (shown only when profile exists)
       │    ├─ Hero Card (next quarterly payment + countdown)
       │    ├─ Income Split Bar (earned vs projected)
       │    ├─ Quarterly Timeline (Q1–Q4 cards)
       │    ├─ Tax Breakdown Accordion
       │    ├─ "What If" Slider
       │    └─ Save-as-you-go Nudge
       └─ TaxReductionGuide (collapsible educational section)
            ├─ Lever 1: Business Expense Deductions
            ├─ Lever 2: Retirement Contributions
            ├─ Lever 3: S-Corp Election (1099 only)
            └─ Lever 4: Quarterly Timing & Safe Harbor
```

## Database Changes

### New table: `tax_intelligence_profiles`

Replaces the fragmented `tax_settings` + `tax_profiles` + `tax_advisor_profiles` profile data with one unified profile. Existing tables remain (backward compat) but the new module reads/writes only this table.

| Column | Type | Default |
|---|---|---|
| id | uuid | gen_random_uuid() |
| user_id | uuid | auth.uid() |
| entity_type | text | 'sole_prop' |
| filing_status | text | 'single' |
| state_code | text | '' |
| other_w2_income | numeric | 0 |
| retirement_type | text | 'none' |
| retirement_contribution | numeric | 0 |
| expense_tracking_level | text | 'none' |
| ytd_expenses_estimate | numeric | 0 |
| scorp_salary | numeric | 0 |
| safe_harbor_method | text | '90_percent' |
| prior_year_tax_paid | numeric | 0 |
| setup_completed_at | timestamptz | null |
| created_at | timestamptz | now() |
| updated_at | timestamptz | now() |

RLS: authenticated users CRUD own rows.

### State tax rates

Store as a constants file (`TAX_CONSTANTS_2026.ts`) — no DB table needed. Contains: federal brackets, standard deductions, SE rates, SS wage cap, and a `STATE_TAX_RATES` map (state code to approximate marginal rate).

## File Changes

### New Files

| File | Purpose |
|---|---|
| `src/lib/taxConstants2026.ts` | All tax constants in one place (brackets, deductions, SE rates, state rates, SS cap) |
| `src/components/tax-intelligence/TaxProfileSetup.tsx` | 8-step wizard modal component |
| `src/components/tax-intelligence/TaxDashboard.tsx` | Live dashboard with hero, income bar, quarterly cards, breakdown, what-if slider |
| `src/components/tax-intelligence/TaxReductionGuide.tsx` | Educational 4-lever guide tailored to entity type |
| `src/components/tax-intelligence/IncomeSplitBar.tsx` | Horizontal bar: earned vs projected income |
| `src/components/tax-intelligence/WhatIfSlider.tsx` | "What if I add $X more" interactive recalculator |
| `src/hooks/useTaxIntelligence.ts` | Hook to load/save `tax_intelligence_profiles`, detect profile existence |

### Modified Files

| File | Change |
|---|---|
| `src/lib/taxCalculations.ts` | Refactor to import from `taxConstants2026.ts`; add state tax calculation; add `calculateFullTaxEstimate()` that accepts the full profile object and shift/invoice data; add safe harbor method support |
| `src/components/business/TaxEstimateTab.tsx` | Replace contents: show TaxProfileSetup if no profile, else show TaxDashboard + collapsible TaxReductionGuide. Keep Ask Advisor and S-Corp Explorer collapsibles |
| `src/pages/TaxCenterPage.tsx` | Pass new hook data to TaxEstimateTab |
| `src/pages/SettingsBusinessTaxesPage.tsx` | Add "Edit Tax Profile" link that opens the setup wizard in edit mode |

### Removed / Deprecated

- `TrackerTab.tsx` internals gutted and replaced by `TaxDashboard.tsx` (the file can be kept as a thin wrapper or removed)
- `GuidanceTab.tsx` replaced by `TaxReductionGuide.tsx`

## Section 1 — Tax Profile Setup (8 Steps)

Multi-step modal dialog using existing `Dialog` component. Each step is a card with a question, options, and contextual help text. Progress indicator at top (step X of 8).

Steps follow the exact spec: Entity Structure (with "not sure" helper), Filing Status, State, Other W-2 Income, Retirement Contributions, Business Expenses (1099 only, with slider shortcut), S-Corp Salary (S-Corp only), Safe Harbor Preference. Completion screen saves profile and dismisses modal.

Profile is editable: "Edit Tax Profile" button on dashboard and in Settings.

## Section 2 — Tax Dashboard

Data sources:
- `shifts` from `useData()` — filter by status for earned (completed/paid) vs projected (upcoming)
- `invoices` from `useData()` — paid invoices for actual income
- `taxProfile` from `useTaxIntelligence()`

Calculations follow the exact formulas in the spec:
- **1099 path**: netIncome, seBase, seTax, seDeduction, AGI (with otherHouseholdIncome), taxableIncome, federalTax (marginal brackets), stateTax, totalAnnualTax, quarterlyPayment
- **S-Corp path**: distribution, payrollTax, taxableIncome, federalTax, stateTax, totalAnnualTax, quarterlyPayment

UI components:
1. **Hero card**: Next quarterly payment amount, due date, countdown in days
2. **Income split bar**: Horizontal stacked bar — earned (green) vs projected from upcoming shifts (blue)
3. **Quarterly timeline**: 4 cards with estimated payment, due date, paid/due status (reuses existing quarter status DB)
4. **Tax breakdown accordion**: Collapsible detail — gross, expenses, net, SE tax, federal, state, total with effective rates
5. **What-if slider**: Input "$X more in shifts this quarter" → live recalculation
6. **Save-as-you-go nudge**: Banner with recommended % and $ per $1,000
7. **Recalculate trigger**: `useMemo` dependencies include shifts, invoices, profile — auto-updates with "Updated just now" timestamp

## Section 3 — Tax Reduction Guide

Tailored educational content using the profile's entity type to show/hide sections:

- **Lever 1** (both): Business expense deductions with personalized callout using logged expenses
- **Lever 2** (both): Retirement contributions with savings table at their income level
- **Lever 3** (1099 only): S-Corp election with their actual numbers and crossover math
- **Lever 4** (both): Quarterly timing, safe harbor explanation, penalty avoidance

Footer with CPA callout and export CTA.

## Demo Mode

All components check `isDemo` and populate realistic Sarah Mitchell data: sole prop, single filing, Oregon, $0 other income, SEP-IRA $6,000, $9,500 expenses, 90% method. Dashboard shows demo shifts/invoices from existing seed data.

## Technical Notes

- Tax year displayed on all estimate screens
- Disclaimer on every screen: "This is an estimate for planning purposes only."
- No stored calculations — always derived live
- Constants file makes annual updates trivial
- Existing `tax_quarter_statuses` table reused for quarterly paid/due tracking

