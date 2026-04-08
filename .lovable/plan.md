
# Tax Intelligence Module — Addendum Implementation

## Overview

Five surgical changes to the existing tax engine: fix S-Corp quarterly estimate math, replace flat state rates with progressive brackets, add PTE tax handling, expand household income for accurate federal brackets, and restructure tax constants. This is a large change touching the calculation engine, profile setup UI, dashboard display, and per-shift nudge.

## Change 1 — Fix S-Corp Quarterly Estimate

**Problem**: S-Corp quarterly 1040-ES currently includes payroll tax (FICA), double-counting it since it's paid through payroll.

**Files changed**:
- `src/components/tax-intelligence/TaxDashboard.tsx` — Update `calculateTax()` S-Corp path: remove payroll tax from `totalAnnualTax` and `quarterlyPayment`. Payroll tax stays as a read-only info line in the breakdown. Quarterly = `(federalTax + stateTax) / 4` only.
- `src/components/schedule/ShiftTaxNudge.tsx` — S-Corp nudge copy changes to "Set aside $X for income tax" with tooltip explaining payroll is separate.
- `src/lib/taxNudge.ts` — S-Corp nudge excludes SE/payroll from set-aside rate.

**Breakdown table update**: Move payroll tax row out of the quarterly estimate section; show it as "Employer payroll taxes (auto-calculated · 7.65% of salary)" with a tooltip.

## Change 2 — Progressive State Tax Brackets

**Problem**: Flat state rates are materially inaccurate for CA, NY, OR, NJ, etc.

**New file**: `src/lib/stateTaxData.ts`
- All 50 states + DC with type (`none`, `flat`, `progressive`), brackets by filing status, standard deductions, PTE availability and rates.
- `applyStateBrackets()` function handles all three state types.
- Replace `STATE_TAX_RATES` usage everywhere with the new bracket engine.

**Profile setup update** (`TaxProfileSetup.tsx`):
- State dropdown stays the same (full 50 states alphabetical).
- After selection, show a dynamic read-only callout: "California · Progressive brackets · Up to 13.3%" or "Texas · No state income tax".

## Change 3 — PTE Tax Handling for S-Corp Users

**New profile fields** (DB migration):
- `pte_elected` (boolean, default false)
- `spouse_w2_income` (numeric, default 0)
- `spouse_has_se_income` (boolean, default false)
- `spouse_se_net_income` (numeric, default 0)

**Profile setup** (`TaxProfileSetup.tsx`):
- Add conditional PTE step after state selection for S-Corp users whose state has `hasPTE: true`.
- Shows explainer with "Yes / No / I don't know" options.
- "I don't know" expands inline savings estimate panel.

**Dashboard** (`TaxDashboard.tsx`):
- When PTE elected: split quarterly display into two side-by-side cards (1040-ES federal + S-Corp PTE state payment).
- Add footer note explaining the split.
- When PTE elected: `personalStateTax = 0`, `scorpPTEPayment = distribution × pteRate`.

## Change 4 — Federal Tax on Gross Household Income

**Profile setup** (`TaxProfileSetup.tsx`):
- Expand the "Other Income" step into a structured household income section: spouse W-2 gross, spouse SE income flag + amount.
- Show calculated total household income as read-only live field.

**Dashboard** (`TaxDashboard.tsx`):
- Add `buildFederalAGI()` that includes spouse income.
- Add bracket visualization below hero card: horizontal segmented bar showing where household income lands, marginal rate callout, and "every additional $1,000 adds $X" line.
- Add `getMarginalRate()` to the exported calculation engine.

**Per-shift nudge** (`src/lib/taxNudge.ts`, `ShiftTaxNudge.tsx`):
- Use marginal federal rate (not effective) for set-aside calculation.
- Tooltip shows breakdown: federal marginal + state effective + SE rate (1099 only).
- Cap total at 45%.

## Change 5 — Tax Constants Architecture

**Restructure constants**:
- `src/lib/taxConstants2026.ts` → rename to `src/lib/taxConstants.ts` (or keep, but update to be the single source of truth for federal brackets, SE rates, SS wage cap, standard deductions)
- `src/lib/stateTaxData.ts` → new file for all 50-state data
- Add `TAX_YEAR_CONFIG` object with `activeYear`, `lastUpdated`, `nextUpdateDue`, `ssWageBase`, `seNetRate`, `seTaxRate`, `standardMileageRate`

**UI footer**: Every estimate screen shows "Estimates based on [year] federal brackets and [state] [year] rates · Last updated: [date]"

**Disclaimer update**: Replace all estimate screen disclaimers with the expanded version from the prompt.

## Database Migration

Add columns to `tax_intelligence_profiles`:
```sql
ALTER TABLE tax_intelligence_profiles
  ADD COLUMN IF NOT EXISTS pte_elected boolean DEFAULT false,
  ADD COLUMN IF NOT EXISTS spouse_w2_income numeric DEFAULT 0,
  ADD COLUMN IF NOT EXISTS spouse_has_se_income boolean DEFAULT false,
  ADD COLUMN IF NOT EXISTS spouse_se_net_income numeric DEFAULT 0;
```

## Updated `TaxIntelligenceProfile` Interface

Add four new fields: `pte_elected`, `spouse_w2_income`, `spouse_has_se_income`, `spouse_se_net_income`.

## Files Summary

| File | Action |
|---|---|
| `src/lib/stateTaxData.ts` | **New** — 50-state progressive bracket data + `applyStateBrackets()` |
| `src/lib/taxConstants2026.ts` | Update — add `TAX_YEAR_CONFIG`, `getMarginalRate()`, additional Medicare threshold; remove `STATE_TAX_RATES` |
| `src/hooks/useTaxIntelligence.ts` | Update — add 4 new profile fields to interface + DEMO_PROFILE + load/save |
| `src/components/tax-intelligence/TaxDashboard.tsx` | Major update — fix S-Corp calc, use progressive state brackets, household AGI, bracket visualization, PTE split cards, updated disclaimer |
| `src/components/tax-intelligence/TaxProfileSetup.tsx` | Update — PTE step, expanded household income step, state callout |
| `src/components/tax-intelligence/TaxReductionGuide.tsx` | Update — use new state bracket engine, updated disclaimer |
| `src/lib/taxNudge.ts` | Update — marginal rate calculation, S-Corp-aware nudge, breakdown |
| `src/components/schedule/ShiftTaxNudge.tsx` | Update — S-Corp copy change, breakdown tooltip |
| `src/components/tax-strategy/TaxDisclaimer.tsx` | Update — new disclaimer text |
| DB migration | Add 4 columns to `tax_intelligence_profiles` |

## Implementation Order

1. DB migration (new profile columns)
2. `src/lib/stateTaxData.ts` (new state bracket data — largest new file)
3. `src/lib/taxConstants2026.ts` (TAX_YEAR_CONFIG, remove flat STATE_TAX_RATES, add getMarginalRate)
4. `src/hooks/useTaxIntelligence.ts` (new fields)
5. `src/components/tax-intelligence/TaxDashboard.tsx` (core engine rewrite)
6. `src/components/tax-intelligence/TaxProfileSetup.tsx` (PTE + household steps)
7. `src/lib/taxNudge.ts` + `ShiftTaxNudge.tsx` (marginal rate nudge)
8. `src/components/tax-intelligence/TaxReductionGuide.tsx` (use new engine)
9. Disclaimer updates across all screens

## Calculation Order (Unified Sequence)

```text
1. BUSINESS INCOME
   1099:   netIncome = gross - expenses
   S-Corp: employerPayroll = salary × 0.0765
           distribution = gross - expenses - salary - employerPayroll
           pteTax = pteElected ? distribution × pteRate : 0
           distribution -= pteTax

2. SE TAX (1099 only)
   seBase = netIncome × 0.9235
   ssTax = min(seBase, ssWageCap) × 0.124
   medicare = seBase × 0.029
   additionalMedicare = max(0, seBase - threshold) × 0.009
   seDeduction = seTax / 2

3. FEDERAL AGI
   1099:   agi = netIncome - seDeduction - retirement + spouseW2 + spouseSE
   S-Corp: agi = salary + distribution - retirement + spouseW2 + spouseSE

4. FEDERAL TAXABLE INCOME = max(0, agi - standardDeduction)
5. FEDERAL TAX = applyBrackets(taxableIncome, filingStatus)
6. STATE TAX = applyStateBrackets(...) or 0 if PTE
7. QUARTERLY 1040-ES
   1099:       (federal + state + seTax) / 4
   S-Corp:    (federal + state) / 4   ← no payroll
   S-Corp PTE: federal / 4 + scorpPTE / 4 (separate card)
8. PER-SHIFT NUDGE = marginalFed + stateEffective + (1099 ? 0.1413 : 0)
```

## Not Changed

- Tax profile setup flow structure and step order (only adding PTE step + expanding household step)
- Three-surface nudge placement (shift card, mark-paid, log footer)
- Educational guide structure (Section 3)
- Safe harbor preference and prior year tax input
- Core disclaimer presence on all screens (just updated text)
