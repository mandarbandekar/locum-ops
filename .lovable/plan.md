

# Tax Intelligence Module — Addendum Implementation Plan

## Overview

Five surgical changes to the existing tax engine. This is a large change touching the calculation engine, profile setup UI, dashboard display, and per-shift nudge across ~10 files.

## Implementation Order

### Step 1 — Database Migration
Add 4 columns to `tax_intelligence_profiles`:
```sql
ALTER TABLE tax_intelligence_profiles
  ADD COLUMN IF NOT EXISTS pte_elected boolean DEFAULT false,
  ADD COLUMN IF NOT EXISTS spouse_w2_income numeric DEFAULT 0,
  ADD COLUMN IF NOT EXISTS spouse_has_se_income boolean DEFAULT false,
  ADD COLUMN IF NOT EXISTS spouse_se_net_income numeric DEFAULT 0;
```

### Step 2 — New File: `src/lib/stateTaxData.ts`
All 50 states + DC with:
- Type: `none`, `flat`, or `progressive`
- Brackets by filing status (single, mfj, hoh)
- State standard deductions
- PTE availability and rates
- `applyStateBrackets(taxableIncome, filingStatus, stateKey, pteElected)` function
- `getStateInfo(stateKey)` helper for UI callouts

States with progressive brackets (full bracket data): AL, CA, CT, DE, GA (transitioning to flat 2025), HI, IA, ID, KS, KY, LA, ME, MD, MN, MO, MT, NE, NJ, NM, NY, NC, ND, OH, OK, OR, RI, SC, VA, VT, WI, WV, DC. Flat-rate states: AZ, CO, GA, IL, IN, MA, MI, MS, NC, NH, PA, UT. No-tax states: AK, FL, NV, NH (interest/dividends only), SD, TN, TX, WA, WY.

### Step 3 — Update `src/lib/taxConstants2026.ts`
- Add `TAX_YEAR_CONFIG` object with `activeYear`, `lastUpdated`, `nextUpdateDue`, `ssWageBase`, `seNetRate`, `seTaxRate`, `standardMileageRate`, `additionalMedicareRate`, `additionalMedicareThreshold`
- Add exported `getMarginalRate(taxableIncome, filingStatus)` function
- Add exported `applyFederalBrackets(taxableIncome, filingStatus)` (extract from TaxDashboard)
- Add `buildFederalAGI()` function
- Remove `STATE_TAX_RATES` flat map (replaced by stateTaxData.ts)
- Keep `US_STATES` array (still needed for dropdowns)

### Step 4 — Update `src/hooks/useTaxIntelligence.ts`
- Add 4 new fields to `TaxIntelligenceProfile` interface: `pte_elected`, `spouse_w2_income`, `spouse_has_se_income`, `spouse_se_net_income`
- Update `DEMO_PROFILE` with defaults
- Update load/save mapping

### Step 5 — Major Update: `src/components/tax-intelligence/TaxDashboard.tsx`

**S-Corp calculation fix (Change 1):**
- Remove payroll tax from `totalAnnualTax` and `quarterlyPayment` for S-Corp
- S-Corp quarterly = `(federalTax + personalStateTax) / 4` only
- Payroll tax shown as read-only business expense line in breakdown

**Progressive state taxes (Change 2):**
- Replace `stateRate * income` with `applyStateBrackets()` from new stateTaxData.ts

**PTE handling (Change 3):**
- When `pte_elected`: `personalStateTax = 0`, add `scorpPTEPayment = distribution × pteRate`
- Split quarterly display into two side-by-side cards (1040-ES + PTE)
- Footer note explaining the split

**Household AGI (Change 4):**
- Include `spouse_w2_income` and `spouse_se_net_income` in AGI calculation
- Add bracket visualization: horizontal segmented bar showing where income lands
- Show marginal rate and "every additional $1,000 adds $X" line

**Updated FullTaxResult interface:** Add `marginalRate`, `scorpPTEPayment`, `personalStateTax` fields.

**Disclaimer update (Change 5):** New expanded disclaimer text referencing tax year and state.

**Tax data version footer:** Show "Estimates based on [year] federal brackets and [state] [year] rates · Last updated: [date]"

### Step 6 — Update `src/components/tax-intelligence/TaxProfileSetup.tsx`

**State callout:** After state selection, show dynamic read-only badge:
- "California · Progressive brackets · Up to 13.3% · PTE available"
- "Texas · No state income tax"

**PTE step (S-Corp only, states with hasPTE):** New conditional step after state:
- Yes / No / I don't know options
- "I don't know" expands inline savings estimate
- Savings calculated as `distribution × pteRate × marginalFederalRate`

**Household income step:** Replace simple "other W-2 income" with structured section:
- Spouse/partner W-2 gross income field
- Spouse has SE income? Yes/No toggle → conditional SE net income field
- Calculated total household income (read-only)

**Step count:** Adjusts dynamically (S-Corp + PTE state = +1 step)

### Step 7 — Update `src/lib/taxNudge.ts`

**Marginal rate calculation:**
- `getShiftSetAside(shiftIncome, taxProfile, calcResult)` uses marginal federal rate + state effective rate + SE rate (1099 only: 0.1413)
- Cap at 45%
- Return breakdown object: `{ federal, state, se, total }`

**S-Corp nudge:** Exclude SE rate from calculation.

**`computeEffectiveSetAsideRate`:** Update to use marginal rate instead of effective rate.

### Step 8 — Update `src/components/schedule/ShiftTaxNudge.tsx`

**S-Corp copy:** "Set aside $X for income tax" instead of "for taxes"
- Tooltip: "Payroll taxes on your salary are handled through your payroll provider. This covers your estimated federal and state income tax only."

**Breakdown tooltip (all users):**
```
Federal income tax (24% marginal): $336
California state tax (9.3%):       $130
SE tax (14.1%):                    $198  ← 1099 only
Total set aside (28% effective):   $392
```

### Step 9 — Update `src/components/tax-intelligence/TaxReductionGuide.tsx`
- Use `applyStateBrackets()` instead of flat rate
- Use `getMarginalRate()` from constants
- Import from new stateTaxData.ts

### Step 10 — Update `src/components/tax-strategy/TaxDisclaimer.tsx`
New disclaimer text:
"Estimates use [year] federal brackets, [state] [year] progressive rates, and inputs from your tax profile. This does not account for the QBI deduction (20% pass-through), AMT, itemized deductions, tax credits, or state-specific nuances beyond income tax. PTE calculations are directional — consult your S-Corp's CPA or tax advisor before electing or modifying PTE status. Use this to plan and save — not to file."

## Files Summary

| File | Action |
|---|---|
| DB migration | Add 4 columns |
| `src/lib/stateTaxData.ts` | **New** — ~600 lines, all 50 states + DC |
| `src/lib/taxConstants2026.ts` | Update — add TAX_YEAR_CONFIG, getMarginalRate, remove STATE_TAX_RATES |
| `src/hooks/useTaxIntelligence.ts` | Update — 4 new profile fields |
| `src/components/tax-intelligence/TaxDashboard.tsx` | Major rewrite — S-Corp fix, progressive state, PTE cards, bracket viz, household AGI |
| `src/components/tax-intelligence/TaxProfileSetup.tsx` | Update — PTE step, household income, state callout |
| `src/lib/taxNudge.ts` | Update — marginal rate, S-Corp aware, breakdown |
| `src/components/schedule/ShiftTaxNudge.tsx` | Update — S-Corp copy, breakdown tooltip |
| `src/components/tax-intelligence/TaxReductionGuide.tsx` | Update — use new bracket engine |
| `src/components/tax-strategy/TaxDisclaimer.tsx` | Update — new disclaimer text |

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
   S-Corp:    (federal + state) / 4
   S-Corp PTE: federal / 4 shown separately from scorpPTE / 4
8. PER-SHIFT NUDGE = marginalFed + stateEffective + (1099 ? 0.1413 : 0)
```

## What Does NOT Change
- Tax profile setup flow structure and step order (only adding PTE step + expanding household step)
- Three-surface nudge placement (shift card, mark-paid, log footer)
- Educational guide structure (content stays, just uses new engine)
- Safe harbor preference and prior year tax input
- Disclaimer presence on all screens (just updated text)

