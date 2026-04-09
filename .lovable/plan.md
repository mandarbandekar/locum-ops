

# Tax Intelligence Module — Analysis & Recommended Changes

## Current Architecture

The module has **three tabs** in the Tax Center:
1. **Tax Estimate** — Profile setup wizard → TaxDashboard (quarterly estimates, bracket viz, payment hub, what-if slider) + TaxReductionGuide (4 levers) + Ask Advisor + S-Corp Explorer
2. **Personalized Tax Strategy** — 7 strategy cards with savings calculations, gated behind 4 completed shifts
3. **CPA Prep** — Accountant-ready packet export

There is also a legacy **TrackerTab** (`src/components/tax-strategy/TrackerTab.tsx`) that duplicates quarterly tracking logic with its own set-aside calculations, quarter statuses, and checklist — largely disconnected from the Tax Intelligence profile.

## Issues Identified

### 1. Expenses Are Not Flowing Into Tax Estimates Properly
- **TaxDashboard** uses `blendedExpenses = Math.max(actualExpenses, profile.ytd_expenses_estimate)` — this picks the *higher* of actual logged expenses vs the profile estimate. If the user carefully logs $5K in expenses but their profile estimate is $8K (default), it uses $8K. This is backwards.
- **Recommendation**: Use actual logged expenses as the primary source. Only fall back to the profile estimate if no expenses are logged. Show users the source ("Using your logged expenses" vs "Using your profile estimate — log expenses for more accuracy").

### 2. Tax Strategies Tab Is Disconnected From Tax Profile
- The strategies engine (`useTaxStrategies`) hardcodes `filingStatus: 'single'` and `stateRate: 0.05` instead of reading from the user's tax profile.
- **Recommendation**: Pull `filing_status`, `state_code`, and `entity_type` from the tax intelligence profile. If the user is already an S-Corp, hide or adjust the S-Corp strategy card.

### 3. Duplicate/Overlapping Content
- **TaxReductionGuide** (inside Tax Estimate tab as a collapsible) covers the same 4 topics as the Personalized Tax Strategy tab: deductions, retirement, S-Corp, quarterly timing. Users see overlapping advice in two places.
- **TrackerTab** (`src/components/tax-strategy/TrackerTab.tsx`) duplicates quarterly payment tracking that already exists in TaxDashboard.
- **Recommendation**: Remove TaxReductionGuide from the Tax Estimate tab entirely. The Personalized Tax Strategy tab is the better, more interactive version. Consolidate TrackerTab's unique features (quarterly status tracking, readiness checklist) into the Tax Estimate tab's quarterly timeline.

### 4. Tax Estimate Tab Is Overloaded
- The Tax Estimate tab currently contains: TaxDashboard + TaxReductionGuide + Ask Advisor + S-Corp Explorer — all stacked vertically in collapsibles. This creates a very long page where the core value (quarterly payment amount) gets buried.
- **Recommendation**: Keep only the TaxDashboard on this tab. Move "Ask the Tax Advisor" and "S-Corp Explorer" out — they're exploratory tools, not estimation.

### 5. Strategy Savings Don't Connect Back to Estimates
- The Personalized Tax Strategy tab shows "Potential annual tax savings: $X" but this number doesn't flow back into the Tax Estimate tab to show "if you apply these strategies, your quarterly payment drops to $Y."
- **Recommendation**: Add a "With strategies applied" comparison row to the TaxDashboard showing the reduced quarterly payment. This creates a clear feedback loop: estimate → strategies → reduced estimate.

### 6. Income Calculation Inconsistency
- TaxDashboard uses `earnedIncome (paid invoices) + projectedIncome (next 90 days of shifts)`.
- TaxStrategiesTab uses `getAnnualizedIncome()` which annualizes from paid invoices over weeks worked.
- These produce different numbers for the same user.
- **Recommendation**: Standardize on one income calculation method across both tabs. Use the TaxDashboard's earned+projected as the canonical figure, or clearly label the difference.

### 7. Strategy Gate Is Too Restrictive
- Personalized Tax Strategy requires 4 completed shifts. But a user who has logged $50K in invoices but only 2 shifts (monthly billing) would be locked out.
- **Recommendation**: Gate on income threshold ($10K+ earned) rather than shift count.

## Proposed Changes

### Phase 1: Fix Data Flow (Critical)
| File | Change |
|---|---|
| `src/components/tax-intelligence/TaxDashboard.tsx` | Fix expense blending: use actual expenses as primary, profile estimate as fallback. Add "expense source" indicator. |
| `src/hooks/useTaxStrategies.ts` | Read `filing_status`, `state_code`, `entity_type` from `useTaxIntelligence()` instead of hardcoding. |
| `src/components/tax-strategies/TaxStrategiesTab.tsx` | Change gate from shift count to income threshold ($10K+). Hide S-Corp strategy if user already elected S-Corp. |

### Phase 2: Remove Duplication
| File | Change |
|---|---|
| `src/components/business/TaxEstimateTab.tsx` | Remove TaxReductionGuide collapsible. Optionally move Ask Advisor and S-Corp Explorer to their own tab or remove (they duplicate strategy content). |
| `src/components/tax-intelligence/TaxReductionGuide.tsx` | Delete — content is covered better by TaxStrategiesTab. |

### Phase 3: Connect Strategies to Estimates
| File | Change |
|---|---|
| `src/components/tax-intelligence/TaxDashboard.tsx` | Add a "With strategies" comparison card showing reduced quarterly payment based on strategy savings total. Link to Personalized Tax Strategy tab. |
| `src/lib/taxStrategies.ts` | Export a helper that computes total applicable savings for the current user profile. |

### Phase 4: Standardize Income
| File | Change |
|---|---|
| `src/lib/taxStrategies.ts` | Update `getAnnualizedIncome()` to accept an optional override income so both tabs can share the same figure. |
| `src/hooks/useTaxStrategies.ts` | Pass the same income figure used by TaxDashboard instead of computing independently. |

## Summary of Impact

- **Users see accurate estimates** because actual expenses are used instead of stale profile estimates
- **Strategies are personalized** to their real filing status and state, not hardcoded defaults
- **No duplicate content** — each piece of tax guidance lives in exactly one place
- **Clear feedback loop** — "You owe $X → apply these strategies → now you owe $Y"
- **Lower barrier to entry** — income-based gate instead of shift-count gate

No database changes required. No new tables or migrations. All changes are frontend logic and component restructuring.

