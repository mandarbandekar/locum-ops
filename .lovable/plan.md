
# Tax Payment Hub — Implementation Plan

## Overview

Add a "Make Your Payment" card to the Tax Intelligence dashboard with direct IRS/state payment links, personal-vs-business account guidance, post-payment confirmation logging, payment history table, and tax deadline reminders.

## Steps

### 1. Database Migration
New `tax_payment_logs` table to store confirmed quarterly payments (quarter, type, amount, date, account source). RLS policy scoped to `auth.uid()`.

### 2. Static Data File — `src/lib/taxPaymentLinks.ts`
- `IRS_PAYMENT` object (Direct Pay + EFTPS with URLs, labels, account types)
- `STATE_PAYMENT_LINKS` map — all 50 states + DC with portal URLs, PTE URLs where applicable
- `getPaymentAccountGuidance(entityType, paymentDestination)` — returns account recommendation, reason, warning text, and portal label

### 3. Payment Log Hook — `src/hooks/useTaxPaymentLogs.ts`
CRUD hook: load payments for current year, `logPayment()`, `getQuarterPayments()`. Demo mode with in-memory state.

### 4. Tax Payment Hub Component — `src/components/tax-intelligence/TaxPaymentHub.tsx`
Card positioned after the quarterly estimate hero in TaxDashboard. Three sections:

- **Federal row**: Amount, teal "Personal account" badge, "Pay federal via IRS Direct Pay" button (opens new tab). S-Corp contextual note.
- **State row**: Conditional on state income tax. Shows portal link + account badge. No-tax states get a green checkmark. S-Corp PTE users get a second row with blue "S-Corp account" badge and PTE portal link.
- **Collapsible explainer**: "Why personal vs business account?" — plain-language guidance adapted to entity type.
- **Post-click confirmation**: Inline prompt after link click — "Did you complete your payment?" Confirm logs payment; dismiss is silent.

### 5. Payment History Table — `src/components/tax-intelligence/TaxPaymentHistory.tsx`
Simple table at the bottom of Tax Estimate tab showing all logged payments: quarter, type, amount, date, account badge. Becomes part of CPA export record.

### 6. Integration into TaxDashboard
- `src/components/tax-intelligence/TaxDashboard.tsx` — Insert `<TaxPaymentHub>` after hero card, `<TaxPaymentHistory>` before disclaimer footer.

### 7. Tax Deadline Reminders
- `src/lib/reminderEngine.ts` — Add `generateTaxDeadlineReminders()` producing reminders at 14 days, 3 days, and day-of for upcoming quarterly deadlines. Skips fully-paid quarters. Deep-links to `/tax-center?tab=tax-estimate`.

### 8. CPA Export Integration
- `src/hooks/useCPAPrepData.ts` — Include payment log data in agenda/readiness so it appears in CPA prep exports.

## Design Rules
- Personal account: teal/success badge
- Business account: blue/info badge
- Wrong-account warnings: amber/warning
- Payment buttons are specific: "Pay federal via IRS Direct Pay →" (not generic "Pay now")
- All payment links open in new tab
- Dollar amounts never in red — use amber for tax amounts, primary for neutral amounts

## Files

| File | Action |
|---|---|
| DB migration | New `tax_payment_logs` table |
| `src/lib/taxPaymentLinks.ts` | New — IRS/state links + account guidance |
| `src/hooks/useTaxPaymentLogs.ts` | New — payment log hook |
| `src/components/tax-intelligence/TaxPaymentHub.tsx` | New — payment hub card |
| `src/components/tax-intelligence/TaxPaymentHistory.tsx` | New — payment history table |
| `src/components/tax-intelligence/TaxDashboard.tsx` | Insert hub + history |
| `src/lib/reminderEngine.ts` | Add tax deadline reminders |
| `src/hooks/useCPAPrepData.ts` | Include payment logs in CPA data |

## What This Does NOT Change
- No payment processing — always redirects to external portals
- No bank linking or Plaid
- Existing tax calculation engine untouched
- Existing reminder channel preferences work as-is
