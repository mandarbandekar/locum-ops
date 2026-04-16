/**
 * Canonical check for whether an invoice is overdue.
 * Overdue is a derived/computed state — it is never stored in the database.
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
  return new Date(invoice.due_date) < new Date();
}
