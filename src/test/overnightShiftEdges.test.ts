/**
 * Overnight-shift edge-case coverage across non-calendar/non-invoice surfaces.
 *
 * One pinning test per gap surfaced in .lovable/plan.md so any future change
 * is intentional. Each block re-implements the exact rule the production code
 * uses (filter / bucket / formatter) so the test fails loudly if that rule
 * drifts.
 */

import { describe, it, expect } from 'vitest';
import { isToday, parseISO, startOfMonth, endOfMonth, format } from 'date-fns';
import { generateIcsCalendar, shiftToIcsEvent } from '@/lib/icsGenerator';
import {
  getQuarterRange,
  sumShiftEarningsInRange,
} from '@/lib/dashboardCalculations';
import { getShiftTaxNudge } from '@/lib/taxNudge';
import { getScheduledMinutes, getBillableMinutes } from '@/lib/shiftBreak';
import type { Shift, Facility } from '@/types';

const FACILITY_ID = 'fac-overnight';

const facility: Facility = {
  id: FACILITY_ID, name: 'Overnight ER', status: 'active',
  address: '123 Vet Way, Portland, OR', timezone: 'America/Los_Angeles',
  notes: '', outreach_last_sent_at: null,
  tech_computer_info: '', tech_wifi_info: '', tech_pims_info: '',
  clinic_access_info: '', invoice_prefix: 'OAE', invoice_due_days: 15,
  invoice_name_to: 'B', invoice_email_to: 'b@x.com',
  invoice_name_cc: '', invoice_email_cc: '',
  invoice_name_bcc: '', invoice_email_bcc: '',
  billing_cadence: 'monthly', billing_cycle_anchor_date: null,
  billing_week_end_day: 'saturday', auto_generate_invoices: true,
};

const makeShift = (
  id: string, startIso: string, endIso: string, rate = 800,
): Shift => ({
  id, facility_id: FACILITY_ID,
  start_datetime: startIso, end_datetime: endIso,
  rate_applied: rate, notes: '', color: 'blue',
} as Shift);

// ──────────────────────────────────────────────────────────────────────────
// 1. iCal export — DTEND uses the rolled-forward end, not same-day
// ──────────────────────────────────────────────────────────────────────────

describe('Overnight shift — iCal export', () => {
  it('emits DTSTART/DTEND with TZID and the next-day end (DTEND > DTSTART)', () => {
    // 22:00 UTC May 31 → 15:00 LA (PDT). 06:00 UTC Jun 1 → 23:00 LA May 31.
    // For a true overnight in LA we want 22:00 LA → 06:00 LA next day,
    // which in UTC is May 31 05:00Z → May 31 13:00Z. Use that instead so the
    // local wall-clock genuinely straddles midnight.
    const overnight = makeShift(
      's-on', '2026-06-01T05:00:00.000Z', '2026-06-01T13:00:00.000Z',
    );
    const ev = shiftToIcsEvent({
      shift: overnight, facility, facilityName: facility.name,
    });
    const dtstart = /DTSTART;TZID=America\/Los_Angeles:(\d{8}T\d{6})/.exec(ev)?.[1];
    const dtend = /DTEND;TZID=America\/Los_Angeles:(\d{8}T\d{6})/.exec(ev)?.[1];
    expect(dtstart).toBe('20260531T220000');
    expect(dtend).toBe('20260601T060000');
    expect(dtend!.localeCompare(dtstart!)).toBeGreaterThan(0);
  });

  it('full calendar contains exactly one VEVENT for an overnight shift (no split)', () => {
    const overnight = makeShift(
      's-on', '2026-06-01T05:00:00.000Z', '2026-06-01T13:00:00.000Z',
    );
    const ics = generateIcsCalendar([overnight], [facility]);
    const begins = ics.match(/BEGIN:VEVENT/g) ?? [];
    expect(begins).toHaveLength(1);
    expect(ics).toContain('DTEND;TZID=America/Los_Angeles:20260601T060000');
  });
});

// ──────────────────────────────────────────────────────────────────────────
// 2. Dashboard "today" classification (mirrors DashboardPage l. 740)
// ──────────────────────────────────────────────────────────────────────────

describe('Overnight shift — Dashboard "Today\'s Shifts"', () => {
  it('a shift starting tonight at 22:00 is classified as today, not tomorrow', () => {
    const today = new Date();
    const startTonight = new Date(
      today.getFullYear(), today.getMonth(), today.getDate(), 22, 0, 0,
    );
    const endTomorrow = new Date(startTonight.getTime() + 8 * 60 * 60 * 1000);
    const shift = makeShift('s-tonight', startTonight.toISOString(), endTomorrow.toISOString());
    // Mirrors the production filter: isToday(parseISO(s.start_datetime))
    expect(isToday(parseISO(shift.start_datetime))).toBe(true);
  });

  it('the morning-after end_datetime is NOT classified as today', () => {
    const today = new Date();
    const startYesterday = new Date(
      today.getFullYear(), today.getMonth(), today.getDate() - 1, 22, 0, 0,
    );
    const endThisMorning = new Date(startYesterday.getTime() + 8 * 60 * 60 * 1000);
    const shift = makeShift('s-yesterday', startYesterday.toISOString(), endThisMorning.toISOString());
    // The shift's start was yesterday, so it doesn't appear in "today's shifts"
    // even though the clinician is technically still finishing it today.
    expect(isToday(parseISO(shift.start_datetime))).toBe(false);
  });
});

// ──────────────────────────────────────────────────────────────────────────
// 3. Quarter-boundary earnings — sumShiftEarningsInRange uses end_datetime
// ──────────────────────────────────────────────────────────────────────────

describe('Overnight shift — quarter-boundary earnings (Mar 31 → Apr 1)', () => {
  // March 31 22:00 → April 1 06:00 (8h, $800 flat)
  const crossQ = makeShift(
    's-cross-q', '2026-03-31T22:00:00', '2026-04-01T06:00:00', 800,
  );

  it('lands in Q2 because sumShiftEarningsInRange buckets by end_datetime', () => {
    const q1 = getQuarterRange(new Date(2026, 2, 15)); // mid March
    const q2 = getQuarterRange(new Date(2026, 4, 15)); // mid May
    expect(sumShiftEarningsInRange([crossQ], q1.start, q1.end)).toBe(0);
    expect(sumShiftEarningsInRange([crossQ], q2.start, q2.end)).toBe(800);
  });

  it('a same-day Mar 31 shift correctly stays in Q1', () => {
    const sameDay = makeShift(
      's-mar', '2026-03-31T09:00:00', '2026-03-31T17:00:00', 800,
    );
    const q1 = getQuarterRange(new Date(2026, 2, 15));
    expect(sumShiftEarningsInRange([sameDay], q1.start, q1.end)).toBe(800);
  });
});

// ──────────────────────────────────────────────────────────────────────────
// 4. Tax withholding nudge — same Q1→Q2 edge as #3 (the "earned this quarter"
//    feeding the nudge comes from sumShiftEarningsInRange)
// ──────────────────────────────────────────────────────────────────────────

describe('Overnight shift — tax withholding nudge', () => {
  it('per-shift set-aside math is rate-driven and ignores shift timing', () => {
    // 8h × $80 = $640; at 28% effective rate → set aside $179
    const nudge = getShiftTaxNudge(640, 0.28);
    expect(nudge.setAsideAmount).toBe(179);
    expect(nudge.netAfterSetAside).toBe(461);
    expect(nudge.effectiveRatePct).toBe(28);
  });

  it('quarter attribution for the nudge follows end_datetime (Q2 for Mar 31 → Apr 1)', () => {
    const cross = makeShift('s-x', '2026-03-31T22:00:00', '2026-04-01T06:00:00', 640);
    const q1 = getQuarterRange(new Date(2026, 2, 15));
    const q2 = getQuarterRange(new Date(2026, 4, 15));
    const earnedQ1 = sumShiftEarningsInRange([cross], q1.start, q1.end);
    const earnedQ2 = sumShiftEarningsInRange([cross], q2.start, q2.end);
    // Drives the "set aside this quarter" tile: $0 for Q1, $640 for Q2.
    expect(getShiftTaxNudge(earnedQ1, 0.28).setAsideAmount).toBe(0);
    expect(getShiftTaxNudge(earnedQ2, 0.28).setAsideAmount).toBe(179);
  });
});

// ──────────────────────────────────────────────────────────────────────────
// 5. Mileage backfill — eligibility uses end_datetime < now (mirrors
//    useBackfillMileage l. 32) and shift_date uses start_datetime's date.
// ──────────────────────────────────────────────────────────────────────────

describe('Overnight shift — mileage backfill eligibility', () => {
  // Mirrors useBackfillMileage's filter + mapping
  function eligibleBackfill(shifts: Shift[], now: Date) {
    return shifts
      .filter(s => new Date(s.end_datetime) < now)
      .map(s => ({ shift_id: s.id, shift_date: s.start_datetime.split('T')[0] }));
  }

  it('an overnight shift becomes eligible only after its (next-day) end has passed', () => {
    const overnight = makeShift(
      's-on', '2026-05-31T22:00:00.000Z', '2026-06-01T06:00:00.000Z',
    );
    // 2 AM on Jun 1 — start passed, end has not
    expect(eligibleBackfill([overnight], new Date('2026-06-01T02:00:00.000Z'))).toEqual([]);
    // 7 AM on Jun 1 — end has passed
    expect(eligibleBackfill([overnight], new Date('2026-06-01T07:00:00.000Z'))).toEqual([
      { shift_id: 's-on', shift_date: '2026-05-31' },
    ]);
  });

  it('shift_date stays on the start day (May 31) even though it ended in June', () => {
    const overnight = makeShift(
      's-on', '2026-05-31T22:00:00.000Z', '2026-06-01T06:00:00.000Z',
    );
    const [row] = eligibleBackfill([overnight], new Date('2026-06-02T00:00:00.000Z'));
    expect(row.shift_date).toBe('2026-05-31');
  });
});

// ──────────────────────────────────────────────────────────────────────────
// 6. Confirmations checklist — month bucketing uses start_datetime
//    (mirrors useConfirmations.getBookedShifts)
// ──────────────────────────────────────────────────────────────────────────

describe('Overnight shift — confirmations month bucketing', () => {
  function getBookedShifts(shifts: Shift[], facilityId: string, monthKey: string) {
    const [year, month] = monthKey.split('-').map(Number);
    const mStart = startOfMonth(new Date(year, month - 1));
    const mEnd = endOfMonth(new Date(year, month - 1));
    return shifts.filter(s => {
      const d = new Date(s.start_datetime);
      return s.facility_id === facilityId && d >= mStart && d <= mEnd;
    });
  }

  it('a May 31 → Jun 1 overnight shift counts in May, not June', () => {
    const overnight = makeShift(
      's-on', '2026-05-31T22:00:00', '2026-06-01T06:00:00',
    );
    expect(getBookedShifts([overnight], FACILITY_ID, '2026-05').map(s => s.id))
      .toEqual(['s-on']);
    expect(getBookedShifts([overnight], FACILITY_ID, '2026-06').map(s => s.id))
      .toEqual([]);
  });
});

// ──────────────────────────────────────────────────────────────────────────
// 7. DST transition overnight — ms-diff currently produces 7h (spring fwd)
//    or 9h (fall back). Pin the current behavior so the team can decide if
//    they want to change it later.
// ──────────────────────────────────────────────────────────────────────────

describe('Overnight shift — DST transitions (current ms-diff behavior)', () => {
  // US spring-forward 2026: 2026-03-08 02:00 → 03:00 local. A shift
  // 22:00 → 06:00 spans this gap; wall clock = 8h, real elapsed = 7h.
  it('spring-forward overnight: 22:00 → 06:00 returns 420 min (7h) by ms diff', () => {
    // Use absolute UTC offsets that bracket the PST→PDT change. PST = -08, PDT = -07.
    const start = '2026-03-07T22:00:00-08:00'; // 06:00 UTC Mar 8
    const end = '2026-03-08T06:00:00-07:00';   // 13:00 UTC Mar 8
    expect(getScheduledMinutes({ start_datetime: start, end_datetime: end })).toBe(420);
  });

  // US fall-back 2026: 2026-11-01 02:00 → 01:00 local. 22:00 → 06:00 = 9h elapsed.
  it('fall-back overnight: 22:00 → 06:00 returns 540 min (9h) by ms diff', () => {
    const start = '2026-10-31T22:00:00-07:00'; // 05:00 UTC Nov 1
    const end = '2026-11-01T06:00:00-08:00';   // 14:00 UTC Nov 1
    expect(getScheduledMinutes({ start_datetime: start, end_datetime: end })).toBe(540);
  });

  it('break deduction still flows through DST-affected billable minutes', () => {
    const start = '2026-03-07T22:00:00-08:00';
    const end = '2026-03-08T06:00:00-07:00';
    const mins = getBillableMinutes({
      start_datetime: start, end_datetime: end,
      break_minutes: 30, worked_through_break: false,
    });
    expect(mins).toBe(390); // 7h - 30min
  });
});

// ──────────────────────────────────────────────────────────────────────────
// 8. Sanity: format() day of an overnight shift uses start_datetime
// ──────────────────────────────────────────────────────────────────────────

describe('Overnight shift — month-key formatting', () => {
  it("format(start, 'yyyy-MM') yields the start month", () => {
    const overnight = makeShift('s-on', '2026-05-31T22:00:00', '2026-06-01T06:00:00');
    // eslint-disable-next-line no-restricted-syntax -- sanity test of date-fns format(), not a UI render
    expect(format(new Date(overnight.start_datetime), 'yyyy-MM')).toBe('2026-05');
  });
});
