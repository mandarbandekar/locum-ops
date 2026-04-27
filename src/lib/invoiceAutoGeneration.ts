import type { Facility, Shift, Invoice, InvoiceLineItem, BillingCadence } from '@/types';
import { format, startOfDay, endOfDay, startOfMonth, endOfMonth, startOfWeek, endOfWeek, addDays, setHours } from 'date-fns';
import { getBillableMinutes } from '@/lib/shiftBreak';
import { getShiftTypeLabel } from '@/lib/onboardingRateMapping';

/**
 * The hour (in local time) at which the early morning system run evaluates
 * invoice generation eligibility. Draft invoices are created during this
 * window — not at shift end time, and not via manual completion.
 */
export const SYSTEM_RUN_HOUR = 5; // 5 AM

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
 * Returns the early-morning system-run timestamp on the appropriate generation day.
 *
 * - Daily: early morning of the shift date itself
 * - Weekly: early morning of the last scheduled shift day in the Mon–Sun week
 * - Monthly: early morning of the last scheduled shift day in the calendar month
 * - Biweekly: early morning of the last scheduled shift day in the 14-day period
 *
 * "Early morning" = SYSTEM_RUN_HOUR (5 AM).
 */
export function getGenerationTriggerDate(
  eligibleShifts: Shift[],
  cadence: BillingCadence,
): Date | null {
  if (eligibleShifts.length === 0) return null;
  if (cadence === 'daily') {
    return setHours(startOfDay(new Date(eligibleShifts[0].start_datetime)), SYSTEM_RUN_HOUR);
  }
  // Weekly / Monthly / Biweekly: early morning system run on the day of the last scheduled shift
  const lastShift = eligibleShifts[eligibleShifts.length - 1];
  return setHours(startOfDay(new Date(lastShift.start_datetime)), SYSTEM_RUN_HOUR);
}

/**
 * Determine if the early morning system run should generate the draft invoice.
 * Returns true when `now` is on or after the SYSTEM_RUN_HOUR on the generation day.
 *
 * Draft invoices are generated automatically during the early morning system run —
 * not at shift end time, and not via manual completion.
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
 * Determine if a draft invoice should be generated immediately because a
 * shift was added today for the current billing period.
 *
 * When a shift is added for today's date, the system should immediately
 * create or update the draft invoice for the relevant billing period,
 * without waiting for the next early morning system run.
 *
 * Returns true when at least one eligible shift falls on `today` AND
 * that shift is within the billing period that contains `today`.
 */
export function shouldGenerateDraftOnShiftAdd(
  eligibleShifts: Shift[],
  cadence: BillingCadence,
  periodStart: Date,
  periodEnd: Date,
  now: Date = new Date(),
): boolean {
  if (eligibleShifts.length === 0) return false;

  const todayStart = startOfDay(now);
  const todayEnd = endOfDay(now);

  // Check if any eligible shift was scheduled for today
  const hasShiftToday = eligibleShifts.some(s => {
    const shiftDate = new Date(s.start_datetime);
    return shiftDate >= todayStart && shiftDate <= todayEnd;
  });

  if (!hasShiftToday) return false;

  // Verify today falls within the billing period
  return now >= periodStart && now <= periodEnd;
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
  type LineDraft = Omit<InvoiceLineItem, 'id' | 'invoice_id'>;
  const lineItems: LineDraft[] = eligibleShifts.map((s): LineDraft => {
    const isHourly = s.rate_kind === 'hourly' && s.hourly_rate != null && s.hourly_rate > 0;
    const dateLabel = format(new Date(s.start_datetime), 'MMM d, yyyy');
    const timeLabel = `${format(new Date(s.start_datetime), 'h:mm a')} – ${format(new Date(s.end_datetime), 'h:mm a')}`;
    const hasBreakDeduction = !s.worked_through_break && (s.break_minutes ?? 0) > 0;
    const breakSuffix = hasBreakDeduction ? ` (incl. ${s.break_minutes} min unpaid break)` : '';
    const typeLabel = getShiftTypeLabel(s.shift_type);
    const coverageLabel = typeLabel ? `${typeLabel} relief coverage` : 'Relief coverage';

    if (!isHourly) {
      return {
        shift_id: s.id,
        description: `${dateLabel} — ${coverageLabel} (${timeLabel})${breakSuffix}`,
        service_date: new Date(s.start_datetime).toISOString().split('T')[0],
        qty: 1,
        unit_rate: s.rate_applied,
        line_total: s.rate_applied,
        line_kind: 'flat' as const,
      };
    }

    // Hourly: single regular line. Use billable minutes (subtracts unpaid break unless overridden).
    const billableMinutes = getBillableMinutes(s);
    const totalHours = Math.round((billableMinutes / 60) * 100) / 100;
    const hourlyRate = Number(s.hourly_rate);
    return {
      shift_id: s.id,
      description: `${dateLabel} — ${coverageLabel} (${timeLabel})${breakSuffix}`,
      service_date: new Date(s.start_datetime).toISOString().split('T')[0],
      qty: totalHours,
      unit_rate: hourlyRate,
      line_total: Math.round(totalHours * hourlyRate * 100) / 100,
      line_kind: 'regular' as const,
    };
  });

  const total = lineItems.reduce((sum, li) => sum + li.line_total, 0);

  // Invoice date = date of the last shift in the period (not today)
  const lastShiftDate = new Date(eligibleShifts[eligibleShifts.length - 1].start_datetime);
  const invoiceDate = new Date(lastShiftDate.getFullYear(), lastShiftDate.getMonth(), lastShiftDate.getDate(), 12, 0, 0);

  const dueDate = new Date(invoiceDate);
  dueDate.setDate(dueDate.getDate() + (facility.invoice_due_days ?? 15));

  return {
    invoice: {
      facility_id: facility.id,
      invoice_number: invoiceNumber,
      invoice_date: invoiceDate.toISOString(),
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
 * Re-group automatic draft invoices for a facility under a new billing cadence.
 *
 * - Identifies the facility's automatic draft invoices and the shifts attached to them
 * - Marks all those drafts for deletion (line items cascade)
 * - Re-buckets the released shifts into new periods using `newCadence`
 * - Skips any new period that's already on the suppressed-periods list
 * - Returns the deletes/creates so the caller can apply them transactionally
 *
 * Sent / partial / paid / manual invoices are never touched.
 */
export function regroupDraftsForCadenceChange(
  facility: Facility,
  allShifts: Shift[],
  existingInvoices: Invoice[],
  existingLineItems: InvoiceLineItem[],
  newCadence: BillingCadence,
  suppressedPeriods: { facility_id: string; period_start: string; period_end: string }[] = [],
  invoiceNumberFactory: (existing: Invoice[], prefix?: string) => string = (() => `${facility.invoice_prefix || 'INV'}-${Date.now()}`),
): {
  draftsToDelete: string[];
  draftsToCreate: {
    invoice: Omit<Invoice, 'id'>;
    lineItems: Omit<InvoiceLineItem, 'id' | 'invoice_id'>[];
  }[];
} {
  // Auto-drafts for this facility
  const autoDrafts = existingInvoices.filter(inv =>
    inv.facility_id === facility.id &&
    inv.status === 'draft' &&
    inv.generation_type === 'automatic'
  );

  if (autoDrafts.length === 0) {
    return { draftsToDelete: [], draftsToCreate: [] };
  }

  const autoDraftIds = new Set(autoDrafts.map(d => d.id));

  // Released shift IDs = shifts currently on those auto-drafts
  const releasedShiftIds = new Set<string>();
  for (const li of existingLineItems) {
    if (li.shift_id && autoDraftIds.has(li.invoice_id)) {
      releasedShiftIds.add(li.shift_id);
    }
  }

  // Resolve to actual shift objects
  const releasedShifts = allShifts.filter(s => releasedShiftIds.has(s.id));

  // Group released shifts into new-cadence periods (keyed by period start ISO date)
  type Bucket = { start: Date; end: Date; shifts: Shift[] };
  const buckets = new Map<string, Bucket>();
  for (const shift of releasedShifts) {
    const period = getBillingPeriod(
      newCadence,
      new Date(shift.start_datetime),
      facility.billing_week_end_day,
      facility.billing_cycle_anchor_date,
    );
    const key = period.start.toISOString().slice(0, 10) + '|' + period.end.toISOString().slice(0, 10);
    const existing = buckets.get(key);
    if (existing) {
      existing.shifts.push(shift);
    } else {
      buckets.set(key, { start: period.start, end: period.end, shifts: [shift] });
    }
  }

  // Build draft objects, skipping suppressed periods
  const draftsToCreate: { invoice: Omit<Invoice, 'id'>; lineItems: Omit<InvoiceLineItem, 'id' | 'invoice_id'>[] }[] = [];
  // Simulate growing invoice list for unique numbering
  const simulatedInvoices: Invoice[] = existingInvoices.filter(inv => !autoDraftIds.has(inv.id));

  // Stable iteration order: by period start
  const orderedBuckets = Array.from(buckets.values()).sort(
    (a, b) => a.start.getTime() - b.start.getTime()
  );

  for (const bucket of orderedBuckets) {
    const periodStartStr = bucket.start.toISOString().slice(0, 10);
    const periodEndStr = bucket.end.toISOString().slice(0, 10);

    const isSuppressed = suppressedPeriods.some(sp => {
      if (sp.facility_id !== facility.id) return false;
      const spStart = new Date(sp.period_start).toISOString().slice(0, 10);
      const spEnd = new Date(sp.period_end).toISOString().slice(0, 10);
      if (spStart !== periodStartStr) return false;
      if (spEnd === periodEndStr) return true;
      const diff = Math.abs(new Date(spEnd).getTime() - new Date(periodEndStr).getTime());
      return diff <= 86400000;
    });
    if (isSuppressed) continue;

    // Sort shifts inside the bucket
    const sortedShifts = [...bucket.shifts].sort(
      (a, b) => new Date(a.start_datetime).getTime() - new Date(b.start_datetime).getTime()
    );

    const invoiceNumber = invoiceNumberFactory(simulatedInvoices, facility.invoice_prefix);
    const built = buildAutoInvoiceDraft(facility, sortedShifts, bucket.start, bucket.end, invoiceNumber);
    // Force-mark cadence on the new invoice
    built.invoice.billing_cadence = newCadence;
    draftsToCreate.push(built);

    // Add a placeholder so subsequent invoiceNumberFactory calls produce a fresh number
    simulatedInvoices.push({ ...(built.invoice as Invoice), id: `pending-${simulatedInvoices.length}` });
  }

  return {
    draftsToDelete: autoDrafts.map(d => d.id),
    draftsToCreate,
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
