import { Shift, Invoice, InvoiceStatus } from '@/types';
import { isInvoiceOverdue } from './invoiceHelpers';

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

/** Effective unpaid-break minutes for a shift; 0 if worked through or none. */
function effectiveBreakMinutes(s: { break_minutes?: number | null; worked_through_break?: boolean | null }): number {
  if (s.worked_through_break) return 0;
  return Math.max(0, s.break_minutes ?? 0);
}

export interface ShiftConflict {
  shift: Shift;
  /** Minutes of scheduled overlap between the two shifts. */
  overlapMinutes: number;
  /**
   * True when the overlap could plausibly fall entirely inside an unpaid break
   * on either shift (overlap ≤ max effective break). Soft warning, not a hard
   * conflict — the clinician may have stepped away during that window.
   */
  isBreakAbsorbable: boolean;
}

export function detectShiftConflicts(shifts: Shift[], newShift: { start_datetime: string; end_datetime: string; id?: string; break_minutes?: number | null; worked_through_break?: boolean | null }): Shift[] {
  return detectShiftConflictsDetailed(shifts, newShift)
    .filter(c => !c.isBreakAbsorbable)
    .map(c => c.shift);
}

/** Richer conflict info — exposes overlap minutes and break-absorbable flag. */
export function detectShiftConflictsDetailed(
  shifts: Shift[],
  newShift: { start_datetime: string; end_datetime: string; id?: string; break_minutes?: number | null; worked_through_break?: boolean | null }
): ShiftConflict[] {
  const newStart = toLocalSlot(newShift.start_datetime);
  const newEnd = toLocalSlot(newShift.end_datetime);
  const newBreak = effectiveBreakMinutes(newShift);

  const out: ShiftConflict[] = [];
  for (const s of shifts) {
    if (s.id === newShift.id) continue;
    const sStart = toLocalSlot(s.start_datetime);
    const sEnd = toLocalSlot(s.end_datetime);
    if (sStart.dateKey !== newStart.dateKey) continue;
    if (!(newStart.minutes < sEnd.minutes && newEnd.minutes > sStart.minutes)) continue;

    const overlapMinutes = Math.max(
      0,
      Math.min(newEnd.minutes, sEnd.minutes) - Math.max(newStart.minutes, sStart.minutes)
    );
    const otherBreak = effectiveBreakMinutes(s);
    // Either shift's unpaid break could absorb the overlap window.
    const isBreakAbsorbable = overlapMinutes > 0 && overlapMinutes <= Math.max(newBreak, otherBreak);
    out.push({ shift: s, overlapMinutes, isBreakAbsorbable });
  }
  return out;
}

export function computeInvoiceStatus(invoice: Invoice): InvoiceStatus | 'overdue' {
  if (invoice.status === 'paid' || invoice.status === 'draft') return invoice.status;
  if (isInvoiceOverdue(invoice)) return 'overdue';
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
