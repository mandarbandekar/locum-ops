

# Align Onboarding Tax Preview with V1 Calculator

## Problem Found
The onboarding tax step (`OnboardingTaxStep.tsx`) uses **hardcoded flat percentages** that don't match the real tax engine (`taxCalculatorV1.ts`):

| Component | Onboarding (current) | In-App V1 Engine |
|-----------|---------------------|------------------|
| Federal income tax | Flat 22% of quarterly income | Progressive brackets (10–37%) with standard deduction |
| SE tax | Flat 15.3% of gross | 15.3% on 92.35% of net, with SS wage cap |
| State tax | Flat 5% | State-specific (progressive/flat/none) |
| Effective rate | Hardcoded 30% | Computed from all components |
| S-Corp savings | Flat 5% of income | Compares full 1099 vs S-Corp paths |

For a user earning $650/day × 240 days = $156K/year, the onboarding shows ~$11,700/quarter tax while the real engine would compute ~$9,800 — a meaningful gap that erodes trust when the user sees different numbers after setup.

## Solution
Replace the hardcoded math in `OnboardingTaxStep.tsx` with a call to `calculate1099Tax()` from the V1 engine, using sensible defaults for fields not yet known (single filer, no expenses, detected state from timezone, no retirement contributions).

## Changes

### `src/components/onboarding/OnboardingTaxStep.tsx`
- Import `calculate1099Tax` and `TaxProfileV1` from `@/lib/taxCalculatorV1`
- Map timezone → state code using the existing `getStateFromTimezone` helper
- Build a `TaxProfileV1` with: `entityType: '1099'`, `annualReliefIncome: rate × 240`, defaults for all other fields
- Call `calculate1099Tax(profile)` and use the result for display values:
  - `quarterlyPayment` → estimated quarterly tax
  - `quarterlyIncome` = `rate × 60` (unchanged)
  - Federal line = `vetFederalShare / 4`
  - SE line = `totalSeTax / 4`
  - State line = `stateTax / 4`
  - Effective rate = `result.effectiveRate`
- For S-Corp savings nudge: call `calculateSCorpTax` with a reasonable salary of 40% and show the delta
- Update the "How we calculate this" copy to reference brackets instead of a flat 30%

### No other files changed
The V1 calculator is already the shared engine — this just wires the onboarding into it.

