/**
 * Overnight shift flow — calendar placement + auto-invoice math.
 *
 * Pins behavior for a shift that crosses midnight (e.g. 22:00 → 06:00
 * the next day, possibly across a month boundary):
 *
 *   1. Schedule calendar rules (mirrors WeekTimeGrid + detectShiftConflicts):
 *      - The shift renders on its START day, not its end day.
 *      - A 7-day week that contains the start day shows it once.
 *      - A 7-day week that contains only the end day does NOT show it.
 *      - The next morning's shift is not flagged as a conflict.
 *
 *   2. Auto-invoice rules (mirrors invoiceAutoGeneration helpers):
 *      - Bucketed by start_datetime, so a May 31 → Jun 1 shift bills in May.
 *      - Hourly billable minutes (with break deduction) drive the line total.
 *      - A shift already on another invoice is excluded.
 */

import { describe, it, expect } from 'vitest';
import { isSameDay, addDays, startOfDay } from 'date-fns';
import {
  getBillingPeriod,
  getEligibleShiftsForPeriod,
  getInvoicedShiftIds,
  buildAutoInvoiceDraft,
} from '@/lib/invoiceAutoGeneration';
import { detectShiftConflicts } from '@/lib/businessLogic';
import { getBillableMinutes } from '@/lib/shiftBreak';
import type { Shift, Facility, InvoiceLineItem } from '@/types';

// ── helpers ────────────────────────────────────────────────────────────────

const FACILITY_ID = 'fac-overnight';

const makeFacility = (overrides?: Partial<Facility>): Facility => ({
  id: FACILITY_ID, name: 'Overnight Animal ER', status: 'active',
  address: '', timezone: 'America/Los_Angeles', notes: '',
  outreach_last_sent_at: null,
  tech_computer_info: '', tech_wifi_info: '', tech_pims_info: '',
  clinic_access_info: '', invoice_prefix: 'OAE', invoice_due_days: 15,
  invoice_name_to: 'Billing', invoice_email_to: 'billing@oae.test',
  invoice_name_cc: '', invoice_email_cc: '',
  invoice_name_bcc: '', invoice_email_bcc: '',
  billing_cadence: 'monthly', billing_cycle_anchor_date: null,
  billing_week_end_day: 'saturday', auto_generate_invoices: true,
  ...overrides,
});

/**
 * Builds a shift in LOCAL time (matches how ShiftFormDialog stores them
 * — no Z suffix, browser local zone). This keeps day-bucket assertions
 * stable in any US test runner timezone.
 */
const makeShift = (
  id: string,
  startLocal: string,
  endLocal: string,
  rate: { kind: 'hourly'; hourly: number } | { kind: 'flat'; flat: number },
  breakMins = 0,
  workedThroughBreak = false,
): Shift => {
  const start = new Date(startLocal);
  const end = new Date(endLocal);
  const base: Shift = {
    id, facility_id: FACILITY_ID,
    start_datetime: start.toISOString(),
    end_datetime: end.toISOString(),
    rate_applied: rate.kind === 'flat' ? rate.flat : 0,
    notes: '', color: 'blue',
    break_minutes: breakMins,
    worked_through_break: workedThroughBreak,
  } as Shift;
  if (rate.kind === 'hourly') {
    (base as Shift).rate_kind = 'hourly';
    (base as Shift).hourly_rate = rate.hourly;
  }
  return base;
};

/** Mirrors WeekTimeGrid: shifts.filter(s => isSameDay(new Date(s.start_datetime), day)). */
function shiftsForDay(shifts: Shift[], day: Date): Shift[] {
  return shifts.filter(s => isSameDay(new Date(s.start_datetime), day));
}
function shiftsForWeek(shifts: Shift[], weekStart: Date): Shift[] {
  const days = Array.from({ length: 7 }, (_, i) => addDays(weekStart, i));
  return shifts.filter(s => days.some(d => isSameDay(new Date(s.start_datetime), d)));
}

// ── scenario ───────────────────────────────────────────────────────────────
//
// Overnight shift: Sunday 2026-05-31 22:00 → Monday 2026-06-01 06:00 (8h)
// Same-day control: Tuesday 2026-06-02 09:00 → 17:00 (8h)
// $80/hr both shifts.

const facility = makeFacility();
const overnight = makeShift(
  'shift-overnight',
  '2026-05-31T22:00:00',
  '2026-06-01T06:00:00',
  { kind: 'hourly', hourly: 80 },
);
const sameDay = makeShift(
  'shift-sameday',
  '2026-06-02T09:00:00',
  '2026-06-02T17:00:00',
  { kind: 'hourly', hourly: 80 },
);
const allShifts = [overnight, sameDay];

// ── calendar placement ─────────────────────────────────────────────────────

describe('Overnight shift — schedule calendar placement', () => {
  it('renders on the start day (May 31), not the end day (Jun 1)', () => {
    const may31 = new Date(2026, 4, 31); // local
    const jun1 = new Date(2026, 5, 1);
    expect(shiftsForDay(allShifts, may31).map(s => s.id)).toEqual(['shift-overnight']);
    expect(shiftsForDay(allShifts, jun1).map(s => s.id)).toEqual([]);
  });

  it('appears exactly once in the week containing May 31', () => {
    const weekStart = startOfDay(new Date(2026, 4, 25)); // Mon May 25
    const inWeek = shiftsForWeek(allShifts, weekStart);
    expect(inWeek.filter(s => s.id === 'shift-overnight')).toHaveLength(1);
  });

  it('does NOT appear in a week that contains only the end day', () => {
    // Week of Jun 1 (Mon) – Jun 7 — the overnight starts May 31 (Sun, prior week)
    const weekStart = startOfDay(new Date(2026, 5, 1));
    const inWeek = shiftsForWeek(allShifts, weekStart);
    expect(inWeek.map(s => s.id)).not.toContain('shift-overnight');
    expect(inWeek.map(s => s.id)).toContain('shift-sameday');
  });

  it('does not flag a 07:00 Jun 1 shift as a conflict with the overnight shift', () => {
    // detectShiftConflicts buckets by the start dateKey — overnight is on May 31,
    // so a Jun 1 morning shift is not a same-day overlap candidate.
    const morningAfter = makeShift(
      'shift-morning',
      '2026-06-01T07:00:00',
      '2026-06-01T15:00:00',
      { kind: 'hourly', hourly: 80 },
    );
    const conflicts = detectShiftConflicts([overnight], morningAfter);
    expect(conflicts).toEqual([]);
  });
});

// ── invoice generation ─────────────────────────────────────────────────────

describe('Overnight shift — auto-invoice generation', () => {
  it('buckets the overnight shift into May (by start_datetime), not June', () => {
    const may = getBillingPeriod('monthly', new Date('2026-05-15T12:00:00'));
    const jun = getBillingPeriod('monthly', new Date('2026-06-15T12:00:00'));

    const eligibleMay = getEligibleShiftsForPeriod(
      allShifts, FACILITY_ID, may.start, may.end, new Set(),
    );
    const eligibleJun = getEligibleShiftsForPeriod(
      allShifts, FACILITY_ID, jun.start, jun.end, new Set(),
    );
    expect(eligibleMay.map(s => s.id)).toEqual(['shift-overnight']);
    expect(eligibleJun.map(s => s.id)).toEqual(['shift-sameday']);
  });

  it('produces correct line totals: 8h × $80 = $640 per shift', () => {
    // Sanity check the duration helper agrees the overnight is 8h.
    expect(getBillableMinutes(overnight)).toBe(480);

    const jun = getBillingPeriod('monthly', new Date('2026-06-15T12:00:00'));
    const eligibleJun = getEligibleShiftsForPeriod(
      allShifts, FACILITY_ID, jun.start, jun.end, new Set(),
    );
    const { invoice: junInv, lineItems: junLines } = buildAutoInvoiceDraft(
      facility, eligibleJun, jun.start, jun.end, 'OAE-001',
    );
    expect(junLines).toHaveLength(1);
    expect(junLines[0].qty).toBe(8);
    expect(junLines[0].line_total).toBe(640);
    expect(junInv.total_amount).toBe(640);
    expect(junInv.balance_due).toBe(640);

    const may = getBillingPeriod('monthly', new Date('2026-05-15T12:00:00'));
    const eligibleMay = getEligibleShiftsForPeriod(
      allShifts, FACILITY_ID, may.start, may.end, new Set(),
    );
    const { invoice: mayInv, lineItems: mayLines } = buildAutoInvoiceDraft(
      facility, eligibleMay, may.start, may.end, 'OAE-002',
    );
    expect(mayLines).toHaveLength(1);
    expect(mayLines[0].shift_id).toBe('shift-overnight');
    expect(mayLines[0].qty).toBe(8);
    expect(mayLines[0].line_total).toBe(640);
    expect(mayInv.total_amount).toBe(640);
  });

  it('excludes the overnight shift if it is already on another invoice (no double-billing)', () => {
    const existing: InvoiceLineItem[] = [{
      id: 'li-existing', invoice_id: 'inv-existing',
      shift_id: 'shift-overnight',
      description: '', service_date: '2026-05-31',
      qty: 8, unit_rate: 80, line_total: 640, line_kind: 'regular',
    }];
    const invoiced = getInvoicedShiftIds(existing);
    const may = getBillingPeriod('monthly', new Date('2026-05-15T12:00:00'));
    const eligible = getEligibleShiftsForPeriod(
      allShifts, FACILITY_ID, may.start, may.end, invoiced,
    );
    expect(eligible).toEqual([]);
  });

  it('flows a 30-min unpaid break through to the line total (7.5h × $80 = $600)', () => {
    const overnightWithBreak = makeShift(
      'shift-overnight-break',
      '2026-05-31T22:00:00',
      '2026-06-01T06:00:00',
      { kind: 'hourly', hourly: 80 },
      30,
      false,
    );
    const may = getBillingPeriod('monthly', new Date('2026-05-15T12:00:00'));
    const eligible = getEligibleShiftsForPeriod(
      [overnightWithBreak], FACILITY_ID, may.start, may.end, new Set(),
    );
    const { invoice, lineItems } = buildAutoInvoiceDraft(
      facility, eligible, may.start, may.end, 'OAE-003',
    );
    expect(lineItems[0].qty).toBe(7.5);
    expect(lineItems[0].line_total).toBe(600);
    expect(invoice.total_amount).toBe(600);
  });
});
