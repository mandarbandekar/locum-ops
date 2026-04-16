

## Plan: Make Schedule Impact Module Entity-Aware (1099 vs S-Corp)

### Problem
`TaxProjectionDisplay` always calculates taxes as 1099 (hardcoded `entityType: '1099'` on line 91), regardless of what the user selected in their tax profile. S-Corp users see incorrect numbers and a misleading "S-Corp could save you..." callout.

### Changes

**`src/components/tax-intelligence/TaxProjectionDisplay.tsx`**
- Add optional props: `entityType?: '1099' | 'scorp'`, `scorpSalary?: number`, `filingStatus?`, `spouseW2Income?`, `retirementContributions?`, `annualBusinessExpenses?`
- When `entityType === 'scorp'`, use `calculateSCorpTax()` instead of `calculate1099Tax()` for the main numbers
- Adjust waterfall labels for S-Corp: replace "Self-employment tax" with "Payroll taxes (employer FICA)" and show salary/distribution split
- Hide the S-Corp savings callout (Section 4) when user is already S-Corp
- Pass through profile fields (filing status, retirement, expenses) so calculations match the full profile

**`src/components/tax-intelligence/TaxDashboard.tsx`**
- Pass `entityType`, `scorpSalary`, and other profile fields to `TaxProjectionDisplay` at line 269

**`src/components/business/TaxEstimateTab.tsx`**
- Pass profile fields through to `TaxProjectionDisplay` in the pre-profile state (lines ~72-78) — here it stays 1099 default since no profile exists yet

### Behavior
- **1099 users**: No change — same calculations, S-Corp callout still shown
- **S-Corp users**: Calculations use S-Corp logic (salary + distribution split, employer FICA instead of full SE tax), waterfall reflects S-Corp structure, S-Corp callout hidden

