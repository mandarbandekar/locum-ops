import { parseISO, differenceInCalendarDays } from 'date-fns';
import type { Facility, Shift } from '@/types';
import { getShiftTotalRevenue } from '@/types';

export type PaymentConfirmationStatus = 'pending' | 'paid' | 'wont_pay';

export interface ShiftPaymentConfirmation {
  id: string;
  shift_id: string;
  status: PaymentConfirmationStatus;
  amount_received: number | null;
  paid_on: string | null; // YYYY-MM-DD
  note: string | null;
  snoozed_until: string | null; // YYYY-MM-DD
  created_at?: string;
  updated_at?: string;
}

/**
 * A shift's payouts are tracked via confirmations (not invoices) when its
 * facility doesn't generate invoices — i.e. platform/agency shifts and
 * Direct-no-invoice clinics.
 */
export function isNoInvoiceFacility(facility: Pick<Facility, 'generates_invoices'> | undefined): boolean {
  return !!facility && facility.generates_invoices === false;
}

/**
 * Returns true when we should nudge the user to confirm payment for this
 * shift on the dashboard. A shift qualifies when:
 *   - its facility is no-invoice
 *   - it ended at least `daysAfter` calendar days ago
 *   - no confirmation row exists, OR it's pending and any snooze has elapsed
 */
export function isShiftAwaitingConfirmation(
  shift: Shift,
  facility: Pick<Facility, 'generates_invoices'> | undefined,
  confirmation: ShiftPaymentConfirmation | undefined,
  now: Date,
  daysAfter = 2,
): boolean {
  if (!isNoInvoiceFacility(facility)) return false;
  const end = parseISO(shift.end_datetime);
  if (Number.isNaN(end.getTime())) return false;
  if (differenceInCalendarDays(now, end) < daysAfter) return false;

  if (!confirmation) return true;
  if (confirmation.status === 'paid' || confirmation.status === 'wont_pay') return false;
  if (confirmation.snoozed_until) {
    const snooze = parseISO(confirmation.snoozed_until);
    if (!Number.isNaN(snooze.getTime()) && differenceInCalendarDays(now, snooze) < 0) return false;
  }
  return true;
}

/**
 * Sum payments collected via shift confirmations for the given month interval.
 * Bucketed by `paid_on` (the date the user reported receiving the money).
 */
export function sumConfirmedPaymentsInRange(
  confirmations: ShiftPaymentConfirmation[],
  rangeStart: Date,
  rangeEnd: Date,
): number {
  let total = 0;
  for (const c of confirmations) {
    if (c.status !== 'paid' || !c.paid_on) continue;
    const d = parseISO(c.paid_on);
    if (Number.isNaN(d.getTime())) continue;
    if (d >= rangeStart && d <= rangeEnd) {
      total += Number(c.amount_received) || 0;
    }
  }
  return Math.round(total * 100) / 100;
}

/**
 * Sum anticipated income from no-invoice shifts in the range that aren't yet
 * resolved (no confirmation, or still pending). Paid shifts are excluded
 * because they belong in Collected; wont_pay shifts are excluded entirely.
 */
export function sumAnticipatedNoInvoiceInRange(
  shifts: Shift[],
  facilitiesById: Map<string, Pick<Facility, 'generates_invoices'>>,
  confirmationsByShiftId: Map<string, ShiftPaymentConfirmation>,
  rangeStart: Date,
  rangeEnd: Date,
): number {
  let total = 0;
  for (const s of shifts) {
    const f = facilitiesById.get(s.facility_id);
    if (!isNoInvoiceFacility(f)) continue;
    const start = parseISO(s.start_datetime);
    if (Number.isNaN(start.getTime())) continue;
    if (start < rangeStart || start > rangeEnd) continue;
    const c = confirmationsByShiftId.get(s.id);
    if (c?.status === 'paid' || c?.status === 'wont_pay') continue;
    total += getShiftTotalRevenue(s);
  }
  return Math.round(total * 100) / 100;
}

/**
 * Default amount to pre-fill when the user marks a shift paid.
 */
export function defaultExpectedAmount(shift: Shift): number {
  return getShiftTotalRevenue(shift);
}
