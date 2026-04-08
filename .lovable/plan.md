

# Friendlier Tax Disclaimers

## Problem

Current disclaimers are technically dense and read like legal warnings ("does not account for QBI deduction (20% pass-through), AMT, itemized deductions..."). This can undermine confidence in the tool. The goal is a warmer tone that positions LocumOps as a powerful planning companion while gently encouraging CPA consultation for filing decisions.

## New Copy

**Primary disclaimer** (TaxDashboard, TaxReductionGuide, TaxStrategyPage):
> "LocumOps gives you a clear picture of your estimated taxes based on your income, expenses, and tax profile — so you can plan ahead with confidence. These estimates are designed for planning and budgeting, not for filing. Every tax situation has nuances, so we always recommend reviewing your numbers with a CPA or tax professional before making final decisions."

**Advisor disclaimer** (Tax Planning Advisor, CPA Prep):
> "Think of this as your smart starting point. LocumOps helps you organize your tax picture and spot opportunities — but your CPA or tax advisor knows the full story. Use what you find here to have a better, faster conversation with them."

**Entity disclaimer** (S-Corp assessment):
> "These scenarios help you explore how different business structures could affect your taxes. They're a starting point for conversations with your CPA — not a recommendation to change your entity type."

## Tone Principles
- Lead with what the tool *does* for you (positive framing)
- Position CPA as a partner, not a correction ("review with" not "consult before")
- No jargon dump (remove QBI, AMT, PTE references from user-facing text — keep those in the detailed "How we calculate" card)
- Keep it short — 2 sentences max for inline disclaimers

## Changes

| File | What |
|---|---|
| `src/components/tax-strategy/TaxDisclaimer.tsx` | Rewrite `getDisclaimer()`, `PERSISTENT_DISCLAIMER`, `ENTITY_DISCLAIMER`, and banner styling (swap AlertTriangle for Info icon, use softer blue/muted tones instead of amber warning) |
| `src/components/tax-advisor/AdvisorDisclaimer.tsx` | Rewrite `ADVISOR_DISCLAIMER` with friendlier copy, swap to Info icon |
| `src/components/tax-intelligence/TaxDashboard.tsx` | Update inline footer disclaimer text (~line 617) |
| `src/components/tax-intelligence/TaxReductionGuide.tsx` | Update inline footer disclaimer text (~line 251) |
| `src/test/taxPlanningAdvisor.test.ts` | Update assertion strings to match new copy |

No logic, database, or structural changes.

