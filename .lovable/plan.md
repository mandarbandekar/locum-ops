
## Plan: Consolidate "overdue" to a computed-only status

**Strategy (per your answers):** `'overdue'` stops being a *stored* status (removed from the `InvoiceStatus` type, scrubbed from DB) but remains a *derived/computed* value returned by `computeInvoiceStatus` and used freely throughout the UI. Existing call sites keep working with zero churn. The new `isInvoiceOverdue()` helper becomes the canonical raw-data check; `computeInvoiceStatus` is refactored to delegate to it.

### 1. New helper — `src/lib/invoiceHelpers.ts` (create)
```ts
export function isInvoiceOverdue(invoice: {
  status: string;
  due_date: string | null;
  balance_due: number;
  paid_at?: string | null;
}): boolean {
  if (invoice.status !== 'sent' && invoice.status !== 'partial') return false;
  if (!invoice.due_date || invoice.balance_due <= 0) return false;
  if (invoice.paid_at) return false;
  return new Date(invoice.due_date) < new Date();
}
```

### 2. Type narrowing — `src/types/index.ts`
- Change `InvoiceStatus` from `'draft' | 'sent' | 'partial' | 'paid' | 'overdue'` → `'draft' | 'sent' | 'partial' | 'paid'`.
- Update `computeInvoiceStatus` return type so it can still return `'overdue'` as a *display* status: change its return type to `InvoiceStatus | 'overdue'`. This keeps every existing `=== 'overdue'` call site type-safe with no edits.

### 3. Refactor — `src/lib/businessLogic.ts`
Update `computeInvoiceStatus` to delegate the overdue check to the helper, and also handle `'partial'` (currently it only flags `'sent'` as overdue):
```ts
import { isInvoiceOverdue } from './invoiceHelpers';

export function computeInvoiceStatus(invoice: Invoice): InvoiceStatus | 'overdue' {
  if (invoice.status === 'paid' || invoice.status === 'draft') return invoice.status;
  if (isInvoiceOverdue(invoice)) return 'overdue';
  return invoice.status;
}
```

### 4. `InvoicesPage.tsx` — use helper for the overdue bucket
Replace `i.computedStatus === 'overdue'` filter with `isInvoiceOverdue(i)`. Drop overdue rows from the `sent` and `partial` buckets so they don't double-count:
```ts
const overdue   = allInvoices.filter(i => isInvoiceOverdue(i));
const sent      = allInvoices.filter(i => i.computedStatus === 'sent'    && !isInvoiceOverdue(i));
const partial   = allInvoices.filter(i => i.computedStatus === 'partial' && !isInvoiceOverdue(i));
```

### 5. `InvoiceStatusGroup.tsx` — no changes
Keep `'overdue'` keys in `statusStyles` and `statusLabels` (display-only). `getDueBadge` already correct.

### 6. Scrub one stale stored-status check — `ClinicScorecardTab.tsx`
Currently: `i.status === 'overdue' || (...)`. Since `'overdue'` is no longer stored, simplify to:
```ts
const overdueCount = fInvoices.filter(i => isInvoiceOverdue(i)).length;
```

### 7. Migration — `supabase/migrations/<ts>_drop_overdue_invoice_status.sql`
The `invoices.status` column is plain `text` with no check constraint and no enum, and currently has zero `'overdue'` rows — but adding the safety net per your spec:
```sql
UPDATE public.invoices SET status = 'sent' WHERE status = 'overdue';
ALTER TABLE public.invoices
  ADD CONSTRAINT invoices_status_check
  CHECK (status IN ('draft','sent','partial','paid'));
```

### Files NOT touched (intentionally)
- `useReminders.ts`, `reminderEngine.ts`, `DashboardPage.tsx`, `FinancialHealthTab.tsx`, `InvoiceEditPanel.tsx`, `AccountsReceivable.tsx`, `ExportCPAPacket.tsx`, `send-reminder-emails/index.ts`, `invoice-reminder.tsx` — all consume `computeInvoiceStatus(...)==='overdue'` or a `reminderType: 'overdue'` literal, which still works correctly.
- Contract checklist `getChecklistBadge` returns its own unrelated `'overdue'`.
- `useTaxAdvisor`, `CPAPrepSummaryTab`, etc. — same, derived only.

### Files modified
1. `src/lib/invoiceHelpers.ts` *(new)*
2. `src/types/index.ts`
3. `src/lib/businessLogic.ts`
4. `src/pages/InvoicesPage.tsx`
5. `src/components/business/ClinicScorecardTab.tsx`
6. `supabase/migrations/<timestamp>_drop_overdue_invoice_status.sql` *(new)*
