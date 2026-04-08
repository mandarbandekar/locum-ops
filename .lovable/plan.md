

# Tax Intelligence UX Improvements

## Current State

The Tax Intelligence dashboard is dense — hero card, full payment hub card, bracket visualization, income split, quarterly timeline, tax breakdown, what-if slider, save nudge, payment history, and disclaimer all stacked vertically. There are no plain-language summaries explaining how numbers were derived.

## Proposed Changes

### 1. Add "How we calculate this" summary card below the hero

A new card directly after the hero that gives a plain-language, personalized summary of the calculation. Dynamically generated based on entity type and profile inputs. Examples:

**1099 user**: "Based on $142,000 in income minus $18,500 in expenses, your net income is $123,500. We calculate $17,458 in self-employment tax (15.3%), deduct half for AGI, add your standard deduction of $16,100, and apply 2026 federal brackets. Your California state tax uses progressive rates on your net income. Combined: $38,200/year or $9,550/quarter."

**S-Corp user**: "Your S-Corp pays you a $70,000 salary. After expenses, your remaining $52,000 flows as distributions. We calculate federal income tax on salary + distributions using 2026 brackets. Payroll taxes on your salary are handled by your payroll provider and excluded from your quarterly estimate."

This replaces the need to expand the "Tax Breakdown Detail" accordion to understand the logic.

### 2. Move Payment Hub into a dialog triggered by a CTA button

I agree with your suggestion. The payment hub is a transactional moment, not something users need to see on every dashboard visit. The change:

- Remove the inline `<TaxPaymentHub>` card from the dashboard
- Add a "Make Your Payment" CTA button directly under the hero card (inside the hero gradient area, after the quarterly amount)
- Button opens a Dialog containing the full payment hub content (federal/state/PTE rows, account badges, confirmation prompts, explainer)
- Dialog title: "Make Your Payment — {quarterLabel}"
- Payment History table stays on the main dashboard (it's a reference, not an action)

### 3. Add KPI card tooltips with explanations

Each of the 4 KPI cards (Total Income, SE Tax/Federal Tax, State Tax/Federal Tax, Total Annual) gets an info icon tooltip explaining what that number represents:

- **Total Income**: "Sum of paid invoices this year ($X earned) plus projected income from upcoming shifts ($Y in next 90 days)"
- **SE Tax**: "Self-employment tax at 15.3% on 92.35% of your net income. Covers Social Security + Medicare since you don't have an employer paying half."
- **Federal Tax**: "Applied 2026 marginal brackets to your taxable income of $X after standard deduction of $Y"
- **State Tax**: "Applied [State] progressive income tax rates to your net business income of $X"
- **Total Annual**: "Sum of all tax obligations. Your effective rate of X% means X cents of every dollar goes to taxes."

### 4. Quarterly timeline — add "paid" status from payment logs

Each quarter card in the timeline currently shows the estimated amount. Enhance to show paid status if a payment was logged for that quarter, with a green checkmark and paid amount.

## Files

| File | Change |
|---|---|
| `src/components/tax-intelligence/TaxDashboard.tsx` | Add summary card, move payment hub to dialog, add KPI tooltips, enhance quarterly cards with paid status |
| `src/components/tax-intelligence/TaxPaymentHub.tsx` | Minor: remove outer Card wrapper (dialog provides the container) |

No new files, no database changes, no calculation logic changes.

