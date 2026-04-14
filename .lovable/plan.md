

# Fix Invoice Reminder Emails: Only Send "Ready to Review" + Overdue

## Problem
The `send-reminder-emails` Edge Function sends digest emails that include ALL draft invoices — both "ready to review" and "upcoming" (future-dated). The app's Invoices page correctly splits these using `invoice_date`, but the email function doesn't apply this filter.

## Root Cause
Line 189 of `supabase/functions/send-reminder-emails/index.ts`:
```typescript
const drafts = invoices.filter((i: any) => i.status === 'draft')
```
This grabs every draft regardless of `invoice_date`. It needs to exclude drafts where `invoice_date` (or `period_end`) is in the future.

## Changes

### 1. `supabase/functions/send-reminder-emails/index.ts`

**Update the invoice query** (line 176) to also select `invoice_date` and `period_end`:
```typescript
.select('id, invoice_number, status, total_amount, balance_due, due_date, facility_id, sent_at, invoice_date, period_end')
```

**Filter drafts to "ready to review" only** (line 189) — match the same logic the UI uses:
```typescript
const todayEnd = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59, 999)
const drafts = invoices.filter((i: any) => {
  if (i.status !== 'draft') return false
  const refDate = i.invoice_date || i.period_end
  if (!refDate) return true // no date = include it
  const d = new Date(refDate.replace(/-/g, '/').split('T')[0]) // parse as local
  return d <= todayEnd
})
```

This ensures only drafts whose billing period has closed appear in reminder emails. Future-dated "upcoming" invoices are excluded.

### 2. Update the client-side reminder engine

**`src/lib/reminderEngine.ts`** — `generateInvoiceReminders()` (line 29):
Apply the same filter so dashboard "needs attention" items also exclude upcoming drafts:
```typescript
const now = new Date()
const todayEnd = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59, 999)
const drafts = invoices.filter(i => {
  if (i.status !== 'draft') return false
  const refDate = (i as any).invoice_date || (i as any).period_end
  if (!refDate) return true
  return new Date(refDate) <= todayEnd
})
```

**`src/hooks/useReminders.ts`** — `useGeneratedReminders()` (line 80):
Same filter for the draft invoice reminders generated here.

### 3. Redeploy the Edge Function
After editing, deploy `send-reminder-emails` so the fix takes effect.

## What stays the same
- Overdue invoice logic (already correct — only includes sent invoices past due date)
- Credential digest logic
- Uninvoiced shift reminders
- SMS alerts for overdue invoices
- Email template rendering

