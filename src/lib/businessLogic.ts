import { Shift, Invoice } from '@/types';

export function detectShiftConflicts(shifts: Shift[], newShift: { start_datetime: string; end_datetime: string; id?: string }): Shift[] {
  const newStart = new Date(newShift.start_datetime).getTime();
  const newEnd = new Date(newShift.end_datetime).getTime();

  return shifts.filter(s => {
    if (s.id === newShift.id) return false;
    if (s.status === 'canceled') return false;
    if (s.status !== 'booked' && s.status !== 'proposed') return false;
    const sStart = new Date(s.start_datetime).getTime();
    const sEnd = new Date(s.end_datetime).getTime();
    return newStart < sEnd && newEnd > sStart;
  });
}

export function computeInvoiceStatus(invoice: Invoice): Invoice['status'] {
  if (invoice.status === 'paid' || invoice.status === 'draft') return invoice.status;
  if (invoice.status === 'sent' && invoice.due_date && !invoice.paid_at) {
    if (new Date() > new Date(invoice.due_date)) return 'overdue';
  }
  return invoice.status;
}

export function generateInvoiceNumber(existingInvoices: Invoice[], prefix: string = 'INV'): string {
  const year = new Date().getFullYear();
  const existing = existingInvoices
    .map(i => i.invoice_number)
    .filter(n => n.startsWith(`${prefix}-${year}`))
    .map(n => parseInt(n.split('-')[2]) || 0);
  const next = existing.length > 0 ? Math.max(...existing) + 1 : 1;
  return `${prefix}-${year}-${String(next).padStart(3, '0')}`;
}

export function getDefaultDueDate(days: number = 14): Date {
  const d = new Date();
  d.setDate(d.getDate() + days);
  return d;
}

export function generateId(): string {
  return Math.random().toString(36).substring(2, 11);
}

export function generateSecureToken(): string {
  return crypto.randomUUID().replace(/-/g, '');
}
