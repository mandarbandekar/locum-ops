## Goal

For shifts at facilities with `generates_invoices = false` (Direct-no-invoice clinics, Via Platform, Via Agency), there's currently no invoice that can be marked Paid — so this revenue never appears in **Monthly Revenue → Collected** or **Total Earnings** on the Business page. We'll add a lightweight payment-confirmation record per shift, prompt the user on the dashboard 2 days after the shift, and roll confirmed payments into the same Collected/Outstanding/Anticipated buckets the invoice flow uses.

## Scope

Applies to any shift whose facility has `generates_invoices = false`, regardless of `engagement_type`. Invoiced shifts are unchanged — their truth still lives on the invoice.

## Data model

New table `shift_payment_confirmations` (one row per shift, created lazily when user takes action):

- `shift_id` (unique, FK)
- `user_id`
- `status` — `pending` | `paid` | `wont_pay`
- `amount_received` (numeric, nullable) — defaults to `shift.rate_applied + overtime` when marked paid, editable
- `paid_on` (date, nullable) — defaults to today when marked paid
- `note` (text, nullable)
- `snoozed_until` (date, nullable) — for "Not yet" → re-prompt in 7 days
- standard `created_at` / `updated_at`

RLS: owner-only via `user_id = auth.uid()`. Standard GRANTs.

A shift is "awaiting confirmation" when: facility.`generates_invoices = false`, shift ended ≥ 2 days ago (using clinic-tz local date), and no row exists OR row is `pending` with `snoozed_until <= today`.

## Dashboard checklist item

In the existing Dashboard Command Center hub, add a new passive checklist row:

- Title: **"Confirm payment for X past shifts"** with combined `$amount` summary.
- Expands to a list: each row shows clinic name, shift date, source (Platform name / clinic / agency), expected amount, and three actions: **Got paid**, **Not yet**, **Won't be paid**.
- **Got paid** opens a compact inline form pre-filled with `paid_on = today` and `amount_received = rate_applied + overtime`. User can edit both before saving. Optional note.
- **Not yet** sets `status = pending`, `snoozed_until = today + 7 days`. Row disappears for a week.
- **Won't be paid** sets `status = wont_pay`. Row disappears permanently; shift is excluded from Anticipated.

Tone follows the "calm competent colleague" rule — e.g. "Two shifts from last week — did the payment land?"

## Revenue integration (FinancialHealthTab + IncomeBySource)

Today `revenueData` in `FinancialHealthTab.tsx` only reads from `invoices`. We extend the three buckets:

- **Collected**: invoice paid totals **+** `shift_payment_confirmations.amount_received` where `status = 'paid'` and `paid_on` falls in the month.
- **Outstanding**: unchanged (invoice-only — no-invoice shifts have no AR concept).
- **Anticipated** (current + next 3 months): existing logic **+** for no-invoice shifts in the month, include `getShiftTotalRevenue(shift)` **unless** that shift has a confirmation row with `status = paid` (already counted in Collected) or `status = wont_pay` (excluded).

`IncomeBySource` already uses raw shift data, so it keeps working unchanged. We'll add a small "✓ Paid" / "Awaiting confirmation" pill on the shift rows it links to (out of scope unless desired).

Total Earnings cumulative chart picks up the new Collected automatically.

## Files to touch

- New migration: `shift_payment_confirmations` table + RLS + GRANTs + `updated_at` trigger.
- New `src/hooks/useShiftPaymentConfirmations.ts` — fetch + mutate, exposed through `DataContext` so charts and dashboard share one cache.
- New `src/components/dashboard/PaymentConfirmationCard.tsx` — checklist row + inline edit form.
- `src/components/dashboard/...` hub: register the new card in the existing checklist list.
- `src/lib/businessLogic.ts` (or a new `paymentConfirmations.ts`): helper `getNoInvoiceCollectedByMonth(shifts, facilities, confirmations)` and `isShiftAwaitingConfirmation(shift, facility, confirmation, today)`.
- `src/components/business/FinancialHealthTab.tsx`: extend `revenueData` calculation as above; tweak the "Collected" tooltip/legend copy to "Collected (invoices + confirmed payouts)".
- `src/components/business/IncomeBySource.tsx`: optional small badge per source showing `$X confirmed of $Y total` (nice-to-have).
- Memory: add `mem://features/business/payment-confirmations` and reference it from the index.

## Edge cases

- Shift in the future or ending < 2 days ago → no prompt, but also excluded from Collected until confirmed.
- User edits the shift's `rate_applied` after confirming — confirmation `amount_received` is the source of truth, not recomputed.
- Shift deleted → cascade delete the confirmation row.
- Demo mode (Sarah Mitchell): seed a handful of `paid` confirmations on past no-invoice shifts so charts look populated, plus 2 pending to show the checklist behavior.
- Timezone: "2 days after shift" uses `get_shift_local_date` (already exists) compared to today in the user's profile timezone — consistent with the rest of the app.

## Out of scope

- No emails or push notifications (per "Dashboard checklist only").
- No edits to invoiced shifts' flow.
- No CSV export of confirmations (can add later if needed).
