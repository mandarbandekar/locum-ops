import { parseDateOnly } from '@/lib/tzTime';

/**
 * Canonical check for whether an invoice is overdue.
 * Overdue is a derived/computed state — it is never stored in the database.
 *
 * `due_date` is a date-only column. Comparing with `new Date(due_date)` would
 * parse it as UTC midnight and flag the invoice overdue hours before the local
 * day ends. We use the tz-safe parser and compare against today's local date.
 */
export function isInvoiceOverdue(invoice: {
  status: string;
  due_date: string | null;
  balance_due: number;
  paid_at?: string | null;
}): boolean {
  if (invoice.status !== 'sent' && invoice.status !== 'partial') return false;
  if (!invoice.due_date || invoice.balance_due <= 0) return false;
  if (invoice.paid_at) return false;
  const due = parseDateOnly(invoice.due_date);
  if (!due) return false;
  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  return due.getTime() < today.getTime();
}

/**
 * Human label for invoice payment terms.
 * 0 days → "Due upon receipt"; otherwise → "Net N".
 */
export function formatPaymentTerms(days: number | null | undefined): string {
  if (days === 0) return 'Due upon receipt';
  return `Net ${days ?? 15}`;
}
