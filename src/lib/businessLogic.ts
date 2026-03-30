import { Shift, Invoice } from '@/types';

/**
 * Normalize a datetime string to { dateKey, minutes-since-midnight } so that
 * comparisons are always in the same frame (local wall-clock).
 */
function toLocalSlot(dt: string) {
  const d = new Date(dt);
  const year = d.getFullYear();
  const month = d.getMonth();
  const day = d.getDate();
  const dateKey = `${year}-${month}-${day}`;
  const minutes = d.getHours() * 60 + d.getMinutes();
  return { dateKey, minutes };
}

export function detectShiftConflicts(shifts: Shift[], newShift: { start_datetime: string; end_datetime: string; id?: string }): Shift[] {
  const newStart = toLocalSlot(newShift.start_datetime);
  const newEnd = toLocalSlot(newShift.end_datetime);

  return shifts.filter(s => {
    if (s.id === newShift.id) return false;
    if (s.status === 'canceled') return false;
    if (s.status !== 'booked' && s.status !== 'proposed') return false;

    const sStart = toLocalSlot(s.start_datetime);
    const sEnd = toLocalSlot(s.end_datetime);

    // Must be on the same calendar day to conflict
    if (sStart.dateKey !== newStart.dateKey) return false;

    // Standard interval overlap: startA < endB && endA > startB
    return newStart.minutes < sEnd.minutes && newEnd.minutes > sStart.minutes;
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
