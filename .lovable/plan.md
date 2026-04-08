# Tax Payment Hub — Implementation Plan

## Overview

Add a "Make Your Payment" card to the Tax Intelligence dashboard, positioned after the quarterly estimate hero. It provides direct IRS and state portal links, account guidance (personal vs business), post-payment confirmation logging, payment history table, and tax deadline reminders.

## Implementation Steps

### Step 1 — Database Migration
New table `tax_payment_logs`:
```sql
CREATE TABLE tax_payment_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL DEFAULT auth.uid(),
  tax_year integer NOT NULL,
  quarter text NOT NULL,
  payment_type text NOT NULL, -- federal_1040es, state_personal, state_pte, payroll_fica
  state_key text,
  amount numeric NOT NULL DEFAULT 0,
  date_paid date NOT NULL DEFAULT CURRENT_DATE,
  paid_from text NOT NULL DEFAULT 'personal', -- personal | business
  confirmed_by_user boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE tax_payment_logs ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can CRUD own tax payment logs"
  ON tax_payment_logs FOR ALL TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);
```

### Step 2 — Static Data Files

**`src/lib/taxPaymentLinks.ts`** — Contains:
- `IRS_PAYMENT` object (Direct Pay + EFTPS with URLs, labels, descriptions, account types)
- `STATE_PAYMENT_LINKS` map (all 50 states + DC with portal URLs, labels, PTE URLs where applicable)
- `getPaymentAccountGuidance(entityType, paymentDestination)` utility function returning account recommendation, reason, warning, and portal label
- `QUARTERLY_DUE_DATES` helper using existing `getQuarterlyDueDates()` from taxConstants2026

### Step 3 — Payment Log Hook

**`src/hooks/useTaxPaymentLogs.ts`** — Hook providing:
- `payments` state loaded from `tax_payment_logs` for current year
- `logPayment(data)` — inserts a confirmed payment record
- `getQuarterPayments(quarter)` — filters payments for a specific quarter
- Demo mode support with in-memory state

### Step 4 — Tax Payment Hub Component

**`src/components/tax-intelligence/TaxPaymentHub.tsx`** — New component receiving `profile`, `taxResult`, and payment log hook. Contains:

**Row 1 — Federal Payment**: Shows quarterly amount, "Pay from personal account" badge (teal), IRS Direct Pay link button. S-Corp note when applicable.

**Row 2 — State Payment**: Conditional on state having income tax. Shows amount, account badge, state portal link. For no-income-tax states: green checkmark with "Nothing to pay here." For S-Corp PTE: additional row with "Pay from S-Corp business account" badge (blue) and PTE portal link.

**Row 3 — Collapsible Explainer**: "Why personal vs business account?" — collapsed by default. Plain-language explanation adapted to entity type.

**Post-click confirmation**: Inline prompt after payment link clicked — "Did you complete your payment?" with confirm/dismiss. On confirm, calls `logPayment()` and updates card to show green "Paid" state.

**Color coding**:
- Personal account: teal/success badge
- Business account: blue/info badge  
- Wrong-account warnings: amber/warning

### Step 5 — Payment History Table

**`src/components/tax-intelligence/TaxPaymentHistory.tsx`** — Simple table at the bottom of the Tax Estimate tab showing all logged payments: quarter, type, amount, date paid, account badge. This becomes the CPA export record.

### Step 6 — Integrate into TaxDashboard

**`src/components/tax-intelligence/TaxDashboard.tsx`** — Insert `<TaxPaymentHub>` after the quarterly payment hero card (after line 351). Insert `<TaxPaymentHistory>` before the disclaimer footer.

**`src/components/business/TaxEstimateTab.tsx`** — No changes needed; TaxPaymentHub lives inside TaxDashboard.

### Step 7 — Tax Deadline Reminders

**`src/lib/reminderEngine.ts`** — Add `generateTaxDeadlineReminders(profile, taxResult, paymentLogs, now)` generating reminders at 14 days, 3 days, and day-of for each upcoming quarterly deadline. Includes amounts and deep-link to `/tax-center?tab=tax-estimate`. Skip quarters already fully paid per payment logs.

### Step 8 — CPA Export Integration

Update `src/hooks/useCPAPrepData.ts` to include payment history in the agenda/readiness data so it appears in CPA prep exports.

## Files

| File | Action |
|---|---|
| DB migration | New `tax_payment_logs` table |
| `src/lib/taxPaymentLinks.ts` | New — IRS/state links + account guidance |
| `src/hooks/useTaxPaymentLogs.ts` | New — CRUD hook for payment logs |
| `src/components/tax-intelligence/TaxPaymentHub.tsx` | New — payment hub card UI |
| `src/components/tax-intelligence/TaxPaymentHistory.tsx` | New — payment history table |
| `src/components/tax-intelligence/TaxDashboard.tsx` | Insert PaymentHub + PaymentHistory |
| `src/lib/reminderEngine.ts` | Add tax deadline reminder generator |
| `src/hooks/useCPAPrepData.ts` | Include payment logs in CPA data |

## What This Does NOT Change
- No actual payment processing — all links open external portals in new tabs
- No bank account linking or Plaid
- Existing tax calculation engine untouched
- Existing reminder preferences and channels work as-is
