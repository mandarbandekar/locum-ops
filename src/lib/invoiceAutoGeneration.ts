import type { Facility, Shift, Invoice, InvoiceLineItem, BillingCadence } from '@/types';
import { format, startOfDay, endOfDay, startOfMonth, endOfMonth, startOfWeek, endOfWeek, addDays } from 'date-fns';

/**
 * Returns whether a shift is invoice-eligible:
 * - booked (not canceled)
 * - not already invoiced
 * Does NOT require shift end time to pass or manual completion.
 */
export function isShiftInvoiceEligible(
  shift: Shift,
  invoicedShiftIds: Set<string>,
): boolean {
  if (shift.status === 'canceled') return false;
  if (invoicedShiftIds.has(shift.id)) return false;
  return true;
}

/**
 * Get the billing period boundaries for a given cadence.
 * - Daily: the given reference date itself
 * - Weekly: Monday–Sunday containing the reference date
 * - Biweekly: unchanged legacy logic using anchor
 * - Monthly: calendar month containing the reference date
 */
export function getBillingPeriod(
  cadence: BillingCadence,
  referenceDate: Date,
  _weekEndDay: string = 'saturday',
  anchorDate?: string | null
): { start: Date; end: Date } {
  switch (cadence) {
    case 'daily': {
      return { start: startOfDay(referenceDate), end: endOfDay(referenceDate) };
    }
    case 'weekly': {
      // Monday–Sunday week
      const weekStart = startOfWeek(referenceDate, { weekStartsOn: 1 }); // Monday
      const weekEnd = endOfDay(addDays(weekStart, 6)); // Sunday EOD
      return { start: weekStart, end: weekEnd };
    }
    case 'biweekly': {
      const anchor = anchorDate ? new Date(anchorDate) : new Date('2026-01-01');
      const daysSinceAnchor = Math.floor((referenceDate.getTime() - anchor.getTime()) / 86400000);
      const periodNum = Math.floor(daysSinceAnchor / 14);
      const periodStart = addDays(anchor, periodNum * 14);
      const periodEnd = endOfDay(addDays(periodStart, 13));
      return { start: startOfDay(periodStart), end: periodEnd };
    }
    case 'monthly': {
      return { start: startOfMonth(referenceDate), end: endOfMonth(referenceDate) };
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
): Shift[] {
  return allShifts
    .filter(s => {
      if (s.facility_id !== facilityId) return false;
      if (!isShiftInvoiceEligible(s, invoicedShiftIds)) return false;
      const shiftStart = new Date(s.start_datetime);
      return shiftStart >= periodStart && shiftStart <= periodEnd;
    })
    .sort((a, b) => new Date(a.start_datetime).getTime() - new Date(b.start_datetime).getTime());
}

/**
 * For Weekly / Monthly cadences, find the last scheduled shift date
 * in the period. The draft should generate on the morning of that date.
 * For Daily, returns the shift date itself.
 */
export function getGenerationTriggerDate(
  eligibleShifts: Shift[],
  cadence: BillingCadence,
): Date | null {
  if (eligibleShifts.length === 0) return null;
  if (cadence === 'daily') {
    return startOfDay(new Date(eligibleShifts[0].start_datetime));
  }
  // Weekly / Monthly / Biweekly: morning of last scheduled shift
  const lastShift = eligibleShifts[eligibleShifts.length - 1];
  return startOfDay(new Date(lastShift.start_datetime));
}

/**
 * Determine if it's time to generate the draft invoice.
 * Returns true if `now` is on or after the morning of the generation trigger date.
 */
export function shouldGenerateDraft(
  eligibleShifts: Shift[],
  cadence: BillingCadence,
  now: Date = new Date(),
): boolean {
  const triggerDate = getGenerationTriggerDate(eligibleShifts, cadence);
  if (!triggerDate) return false;
  return now >= triggerDate;
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
 * Get the set of shift IDs on SENT invoices only (for duplicate prevention).
 * Shifts on draft invoices can still be updated.
 */
export function getSentInvoiceShiftIds(
  lineItems: InvoiceLineItem[],
  invoices: Invoice[],
): Set<string> {
  const sentInvoiceIds = new Set(
    invoices.filter(i => i.status !== 'draft').map(i => i.id)
  );
  const ids = new Set<string>();
  for (const li of lineItems) {
    if (li.shift_id && sentInvoiceIds.has(li.invoice_id)) {
      ids.add(li.shift_id);
    }
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

/**
 * Check if a draft invoice can be sent.
 * Missing billing contact = warning only (draft still generated).
 * Missing sender details = blocks sending.
 */
export function canSendInvoice(
  facility: Facility,
  senderProfile: { first_name: string; last_name: string; company_name: string; email: string | null },
): { canSend: boolean; warnings: string[]; blockers: string[] } {
  const warnings: string[] = [];
  const blockers: string[] = [];

  if (!facility.invoice_email_to?.trim()) {
    warnings.push('Add a billing contact before sending this invoice.');
  }

  if (!senderProfile.first_name && !senderProfile.last_name) {
    blockers.push('Sender name is required to send invoices.');
  }
  if (!senderProfile.company_name) {
    blockers.push('Company name is required to send invoices.');
  }
  if (!senderProfile.email) {
    blockers.push('Sender email is required to send invoices.');
  }

  return {
    canSend: blockers.length === 0,
    warnings,
    blockers,
  };
}
