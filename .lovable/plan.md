

# Add Contextual Tooltips Across Tax Intelligence Modules

## Summary
Create a reusable `TaxTerm` tooltip component and add hover-based explanations to every tax term across all Tax Intelligence UI — the profile setup wizard, the dashboard breakdown, the entity comparison card, the payment hub, and the what-if slider.

## Approach
Build a single glossary map of tax terms and a lightweight `TaxTerm` wrapper that renders an inline dotted-underline text with a tooltip on hover. Then replace plain text labels throughout the tax modules with `<TaxTerm>` where appropriate.

## File Changes

### New file: `src/components/tax-intelligence/TaxTerm.tsx`
- A glossary constant mapping ~20 term keys to plain-English definitions written for relief vets (e.g., `k1_distribution`, `se_tax`, `agi`, `marginal_rate`, `effective_rate`, `employer_fica`, `1040es`, `standard_deduction`, `w2_salary`, `filing_status_mfj`, `filing_status_hoh`, `reasonable_compensation`, `schedule_c`, `pte`, `quarterly_payment`, `federal_taxable_income`, `retirement_sep`, `retirement_solo401k`, `extra_withholding`, `net_income`)
- A `TaxTerm` component: accepts `term` (glossary key) and `children` (display text), renders children with a dotted underline + `HelpCircle` icon + Radix `Tooltip` showing the definition
- Compact, non-intrusive styling — only visible context on hover/focus

### Modified: `src/components/tax-intelligence/TaxProfileSetup.tsx`
Add `<TaxTerm>` wrappers to:
- "K-1 distribution" label in the S-Corp income step
- "W-2 salary" and "reasonable compensation" in the income step
- "Schedule C" mention in entity step
- "1120-S" mention in entity step  
- "SEP-IRA" and "Solo 401(k)" in retirement step
- "Filing status" options (MFJ, HOH)
- "Extra withholding" in the withholding step

### Modified: `src/components/tax-intelligence/TaxDashboard.tsx`
Add `<TaxTerm>` to the `Row` component (conditionally, via optional `term` prop) and apply to:
- "SE tax", "K-1 distribution", "Employer FICA", "AGI", "Standard deduction", "Federal taxable income", "Marginal rate", "1040-ES", "Spouse withholding"
- The "effective rate" in the set-aside nudge
- The "quarterly payment" explanation

### Modified: `src/components/tax-intelligence/EntityComparisonCard.tsx`
Add `<TaxTerm>` via optional `term` prop on `CompRow` for:
- "SE tax", "K-1 distribution", "Employer FICA", "W-2 salary", "Reasonable compensation" slider label

### Modified: `src/components/tax-intelligence/TaxPaymentHub.tsx`
Add `<TaxTerm>` to:
- "1040-ES" references
- "PTE" label
- "FICA" / "payroll withholding" in the explainer section

### Modified: `src/components/tax-intelligence/WhatIfSlider.tsx`
- Add tooltip on "quarterly payment" label

## Technical Details
- Uses existing `Tooltip`/`TooltipTrigger`/`TooltipContent` from `@/components/ui/tooltip`
- Wraps everything in `TooltipProvider` (already in the app or added at module level)
- The glossary is a simple `Record<string, string>` — easy to extend
- No database changes, no new dependencies

