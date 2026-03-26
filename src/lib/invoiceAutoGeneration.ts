import type { Facility, Shift, Invoice, InvoiceLineItem, BillingCadence } from '@/types';
import { format, startOfDay, endOfDay, startOfMonth, endOfMonth, startOfWeek, endOfWeek, subDays, addDays, isBefore, isAfter, isWithinInterval } from 'date-fns';

const GRACE_HOURS = 2;

/**
 * Returns whether a shift is invoice-eligible:
 * - end time has passed (with grace window)
 * - not canceled
 * - not already invoiced (no line item pointing to it)
 */
export function isShiftInvoiceEligible(
  shift: Shift,
  invoicedShiftIds: Set<string>,
  now: Date = new Date()
): boolean {
  if (shift.status === 'canceled') return false;
  if (invoicedShiftIds.has(shift.id)) return false;
  const endTime = new Date(shift.end_datetime);
  const graceEnd = new Date(endTime.getTime() + GRACE_HOURS * 60 * 60 * 1000);
  return now >= graceEnd;
}

/**
 * Get the billing period boundaries for a given cadence.
 * Returns the most recently completed period.
 */
export function getBillingPeriod(
  cadence: BillingCadence,
  referenceDate: Date,
  weekEndDay: string = 'saturday',
  anchorDate?: string | null
): { start: Date; end: Date } {
  const dayMap: Record<string, number> = {
    sunday: 0, monday: 1, tuesday: 2, wednesday: 3,
    thursday: 4, friday: 5, saturday: 6,
  };

  switch (cadence) {
    case 'daily': {
      const yesterday = subDays(startOfDay(referenceDate), 1);
      return { start: startOfDay(yesterday), end: endOfDay(yesterday) };
    }
    case 'weekly': {
      const weekEndDayNum = dayMap[weekEndDay] ?? 6;
      // Find the most recent occurrence of weekEndDay before referenceDate
      let end = new Date(referenceDate);
      while (end.getDay() !== weekEndDayNum || end >= referenceDate) {
        end = subDays(end, 1);
      }
      end = endOfDay(end);
      const start = startOfDay(addDays(end, -6));
      return { start, end };
    }
    case 'biweekly': {
      if (!anchorDate) {
        // Fallback: treat as 2-week periods from epoch
        const anchor = new Date('2026-01-01');
        const daysSinceAnchor = Math.floor((referenceDate.getTime() - anchor.getTime()) / 86400000);
        const periodNum = Math.floor(daysSinceAnchor / 14);
        const periodStart = addDays(anchor, periodNum * 14);
        const periodEnd = endOfDay(addDays(periodStart, 13));
        // Return previous completed period
        if (referenceDate <= periodEnd) {
          const prevStart = addDays(periodStart, -14);
          return { start: startOfDay(prevStart), end: endOfDay(addDays(prevStart, 13)) };
        }
        return { start: startOfDay(periodStart), end: periodEnd };
      }
      const anchor = new Date(anchorDate);
      const daysSinceAnchor = Math.floor((referenceDate.getTime() - anchor.getTime()) / 86400000);
      const periodNum = Math.floor(daysSinceAnchor / 14);
      const periodStart = addDays(anchor, periodNum * 14);
      const periodEnd = endOfDay(addDays(periodStart, 13));
      if (referenceDate <= periodEnd) {
        const prevStart = addDays(periodStart, -14);
        return { start: startOfDay(prevStart), end: endOfDay(addDays(prevStart, 13)) };
      }
      return { start: startOfDay(periodStart), end: periodEnd };
    }
    case 'monthly': {
      const prevMonth = new Date(referenceDate.getFullYear(), referenceDate.getMonth() - 1, 1);
      return { start: startOfMonth(prevMonth), end: endOfMonth(prevMonth) };
    }
    default:
      return { start: startOfMonth(referenceDate), end: endOfMonth(referenceDate) };
  }
}

/**
 * Get eligible shifts for a facility within a billing period.
 */
export function getEligibleShiftsForPeriod(
  allShifts: Shift[],
  facilityId: string,
  periodStart: Date,
  periodEnd: Date,
  invoicedShiftIds: Set<string>,
  now: Date = new Date()
): Shift[] {
  return allShifts
    .filter(s => {
      if (s.facility_id !== facilityId) return false;
      if (!isShiftInvoiceEligible(s, invoicedShiftIds, now)) return false;
      const shiftStart = new Date(s.start_datetime);
      return shiftStart >= periodStart && shiftStart <= periodEnd;
    })
    .sort((a, b) => new Date(a.start_datetime).getTime() - new Date(b.start_datetime).getTime());
}

/**
 * Get the set of shift IDs already on any invoice (any status).
 */
export function getInvoicedShiftIds(lineItems: InvoiceLineItem[]): Set<string> {
  const ids = new Set<string>();
  for (const li of lineItems) {
    if (li.shift_id) ids.add(li.shift_id);
  }
  return ids;
}

/**
 * Build a draft invoice object for auto-generation.
 */
export function buildAutoInvoiceDraft(
  facility: Facility,
  eligibleShifts: Shift[],
  periodStart: Date,
  periodEnd: Date,
  invoiceNumber: string,
): {
  invoice: Omit<Invoice, 'id'>;
  lineItems: Omit<InvoiceLineItem, 'id' | 'invoice_id'>[];
} {
  const lineItems = eligibleShifts.map(s => ({
    shift_id: s.id,
    description: `${format(new Date(s.start_datetime), 'MMM d, yyyy')} — Relief coverage (${format(new Date(s.start_datetime), 'h:mm a')} – ${format(new Date(s.end_datetime), 'h:mm a')})`,
    service_date: new Date(s.start_datetime).toISOString().split('T')[0],
    qty: 1,
    unit_rate: s.rate_applied,
    line_total: s.rate_applied,
  }));

  const total = lineItems.reduce((sum, li) => sum + li.line_total, 0);
  const dueDate = new Date();
  dueDate.setDate(dueDate.getDate() + (facility.invoice_due_days || 15));

  return {
    invoice: {
      facility_id: facility.id,
      invoice_number: invoiceNumber,
      invoice_date: new Date().toISOString(),
      period_start: periodStart.toISOString(),
      period_end: periodEnd.toISOString(),
      total_amount: total,
      balance_due: total,
      status: 'draft',
      sent_at: null,
      paid_at: null,
      due_date: dueDate.toISOString(),
      notes: '',
      share_token: null,
      share_token_created_at: null,
      share_token_revoked_at: null,
      invoice_type: 'bulk',
      generation_type: 'automatic',
      billing_cadence: facility.billing_cadence,
    },
    lineItems,
  };
}
