

# Fix: Deleted Invoices Keep Regenerating

## Root Cause

When a user deletes an auto-generated draft invoice, the shifts that were on it become "uninvoiced" again. The next time:
- A new shift is added (triggers `addShift` auto-generation in DataContext)
- The `generate-auto-invoices` edge function runs on its cron schedule

...those shifts pass the eligibility check (`getSentInvoiceShiftIds` only protects shifts on *sent* invoices, not deleted ones) and a brand new draft is created for the same billing period. This cycle repeats every time.

## Solution

Add a **suppression table** that records facility + billing period combinations the user has chosen to stop auto-generating. When deleting an auto-generated invoice, show a confirmation dialog asking whether to suppress future auto-generation for that period.

### Step 1 — Database Migration
Create `suppressed_invoice_periods` table:
- `id`, `user_id`, `facility_id`, `period_start`, `period_end`, `created_at`
- RLS policy: users can CRUD own rows
- Unique constraint on `(user_id, facility_id, period_start, period_end)`

### Step 2 — Enhanced Delete Confirmation Dialog
In `InvoicesPage.tsx` and `InvoiceDetailPage.tsx`, when deleting an auto-generated (`generation_type === 'automatic'`) invoice:
- Show a dialog: "This invoice was auto-generated. Do you also want to prevent it from being recreated for this billing period?"
- Two options: "Delete Only" (just deletes) and "Delete & Suppress" (deletes + inserts suppression record)
- Non-automatic invoices get the standard delete flow unchanged

### Step 3 — Update `deleteInvoice` in DataContext
Add a new function `suppressInvoicePeriod(facilityId, periodStart, periodEnd)` that inserts into the suppression table. Load suppressed periods on init alongside other data.

### Step 4 — Guard Auto-Generation (Client-Side)
In `DataContext.addShift` auto-generation block (~line 282-408):
- Before creating a new draft, check if `(facility_id, period_start, period_end)` exists in the suppressed periods list
- If suppressed, skip generation silently

### Step 5 — Guard Auto-Generation (Edge Function)
In `supabase/functions/generate-auto-invoices/index.ts`:
- Query `suppressed_invoice_periods` for the facility's user
- Before creating a new invoice for a period, check if that period is suppressed
- Skip with `action: "period_suppressed"` in results

### Step 6 — Guard `InvoiceStatusGroup` Delete (Bulk)
The bulk delete in `InvoicesPage` iterates `selected` IDs. For auto-generated invoices in the selection, show the same suppression choice before proceeding.

## Files

| File | Change |
|---|---|
| DB migration | New `suppressed_invoice_periods` table |
| `src/contexts/DataContext.tsx` | Load suppressed periods, add `suppressInvoicePeriod()`, guard `addShift` auto-gen |
| `src/pages/InvoicesPage.tsx` | Enhanced delete dialog for auto-generated invoices |
| `src/pages/InvoiceDetailPage.tsx` | Enhanced delete dialog for auto-generated invoices |
| `supabase/functions/generate-auto-invoices/index.ts` | Check suppression table before creating drafts |

## What Does NOT Change
- Manual invoice creation unaffected
- Existing draft update logic (when draft exists) unaffected — suppression only blocks *new* draft creation
- Sent/paid invoice handling unchanged
- Billing cadence and period calculation logic unchanged

