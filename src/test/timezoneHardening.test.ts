// V1 timezone hardening tests.
//
// These exercise the pure helpers in `src/lib/invoicePeriodTz.ts`,
// `src/lib/tzTime.ts`, and `src/lib/resolveTimezone.ts` — the same logic the
// edge functions use via `supabase/functions/_shared/tzTime.ts` (kept in
// sync intentionally). They cover the 8 scenarios called out in the V1
// hardening pass: cross-tz creation, no-DST states (Arizona), overnight
// shifts, month-end invoice boundaries, the UTC-rollover bug, DST, reminder
// "today/tomorrow" classification, and facility tz edit protection via
// `timezone_at_creation`.

import { describe, it, expect } from 'vitest';
import {
  zonedWallClockToUtc,
  getPartsInTz,
  formatTimeInTz,
  formatHHMMInTz,
} from '@/lib/tzTime';
import {
  periodLocalBounds,
  periodBoundsUtc,
  isShiftOnLocalDay,
  localYMD,
} from '@/lib/invoicePeriodTz';
import { resolveShiftTz } from '@/lib/resolveTimezone';

const LA = 'America/Los_Angeles';
const PHX = 'America/Phoenix'; // no DST
const ROME = 'Europe/Rome';
const NY = 'America/New_York';

describe('Timezone hardening V1', () => {
  // ─────────────────────────────────────────────────────────────────────
  // 1) User in Italy creates an 8 AM shift for a California clinic.
  //    The stored UTC instant must match LA 8 AM, and rendering in LA tz
  //    must show 8:00 AM regardless of where the browser is.
  // ─────────────────────────────────────────────────────────────────────
  it('Italy user creates 8 AM Pacific shift — stored UTC + LA display correct', () => {
    const utc = zonedWallClockToUtc('2026-05-15', '08:00', LA);
    // May 15 LA in DST = UTC-7, so 8 AM PT = 15:00 UTC.
    expect(utc.toISOString()).toBe('2026-05-15T15:00:00.000Z');
    expect(formatHHMMInTz(utc, LA)).toBe('08:00');
    expect(formatTimeInTz(utc, LA)).toMatch(/8:00\s?AM/i);
    // Same instant in Italy would be 17:00.
    expect(formatHHMMInTz(utc, ROME)).toBe('17:00');
  });

  // ─────────────────────────────────────────────────────────────────────
  // 2) Clinic in Arizona (no DST) + user in California.
  //    Display must always be Arizona time.
  // ─────────────────────────────────────────────────────────────────────
  it('Arizona clinic / California user — displays in clinic (PHX) tz', () => {
    // 9 AM Arizona in mid-July = UTC-7 = 16:00 UTC.
    const utc = zonedWallClockToUtc('2026-07-15', '09:00', PHX);
    expect(utc.toISOString()).toBe('2026-07-15T16:00:00.000Z');
    expect(formatHHMMInTz(utc, PHX)).toBe('09:00');
    // Same instant in LA in July (PDT, UTC-7) would also be 09:00, but in
    // winter when PHX stays UTC-7 and LA shifts to PST (UTC-8) they diverge:
    const utcWinter = zonedWallClockToUtc('2026-01-15', '09:00', PHX);
    expect(formatHHMMInTz(utcWinter, PHX)).toBe('09:00');
    expect(formatHHMMInTz(utcWinter, LA)).toBe('08:00');
  });

  // ─────────────────────────────────────────────────────────────────────
  // 3) Overnight shift 8 PM → 6 AM next day, 10h duration preserved.
  // ─────────────────────────────────────────────────────────────────────
  it('Overnight shift rolls end to next day with correct 10h duration', () => {
    const start = zonedWallClockToUtc('2026-05-20', '20:00', LA);
    const end = zonedWallClockToUtc('2026-05-21', '06:00', LA);
    expect(end.getTime() - start.getTime()).toBe(10 * 60 * 60 * 1000);
    expect(formatHHMMInTz(start, LA)).toBe('20:00');
    expect(formatHHMMInTz(end, LA)).toBe('06:00');
    expect(localYMD(start, LA)).toBe('2026-05-20');
    expect(localYMD(end, LA)).toBe('2026-05-21');
  });

  // ─────────────────────────────────────────────────────────────────────
  // 4) Month-end invoice boundary — May 31 11 PM Pacific belongs to MAY.
  // ─────────────────────────────────────────────────────────────────────
  it('May 31 11 PM Pacific shift belongs to May monthly invoice period', () => {
    const shiftUtc = zonedWallClockToUtc('2026-05-31', '23:00', LA);
    // Sanity: in UTC this is June 1.
    expect(shiftUtc.toISOString().slice(0, 10)).toBe('2026-06-01');

    const bounds = periodBoundsUtc('monthly', shiftUtc, LA);
    expect(bounds.startYMD).toBe('2026-05-01');
    expect(bounds.endYMD).toBe('2026-05-31');
    // Period must include the shift instant.
    expect(shiftUtc.getTime()).toBeGreaterThanOrEqual(bounds.startUtc.getTime());
    expect(shiftUtc.getTime()).toBeLessThan(bounds.endUtcExclusive.getTime());
    expect(isShiftOnLocalDay(shiftUtc, '2026-05-31', LA)).toBe(true);
  });

  // ─────────────────────────────────────────────────────────────────────
  // 5) UTC-rollover bug prevention — same shift is NOT in June period.
  // ─────────────────────────────────────────────────────────────────────
  it('May 31 11 PM Pacific shift is NOT in June period', () => {
    const shiftUtc = zonedWallClockToUtc('2026-05-31', '23:00', LA);
    const juneRef = zonedWallClockToUtc('2026-06-15', '12:00', LA);
    const juneBounds = periodBoundsUtc('monthly', juneRef, LA);
    expect(juneBounds.startYMD).toBe('2026-06-01');
    expect(shiftUtc.getTime()).toBeLessThan(juneBounds.startUtc.getTime());
    // And in local terms the shift is on May 31, not June 1.
    expect(localYMD(shiftUtc, LA)).toBe('2026-05-31');
  });

  // ─────────────────────────────────────────────────────────────────────
  // 6) DST transition — spring forward (Mar 8 2026) and fall back (Nov 1 2026)
  //    must not break local display or monthly period assignment.
  // ─────────────────────────────────────────────────────────────────────
  it('DST: shifts straddling spring-forward still report correct local time', () => {
    // 10 AM on March 8 2026 (spring forward day) in LA.
    const utc = zonedWallClockToUtc('2026-03-08', '10:00', LA);
    expect(formatHHMMInTz(utc, LA)).toBe('10:00');
    // March monthly period contains it.
    const b = periodBoundsUtc('monthly', utc, LA);
    expect(b.startYMD).toBe('2026-03-01');
    expect(b.endYMD).toBe('2026-03-31');
    expect(utc.getTime()).toBeLessThan(b.endUtcExclusive.getTime());
  });

  it('DST: shifts on fall-back day still report correct local time', () => {
    const utc = zonedWallClockToUtc('2026-11-01', '10:00', LA);
    expect(formatHHMMInTz(utc, LA)).toBe('10:00');
    const b = periodBoundsUtc('monthly', utc, LA);
    expect(b.startYMD).toBe('2026-11-01');
    expect(b.endYMD).toBe('2026-11-30');
  });

  // ─────────────────────────────────────────────────────────────────────
  // 7) Reminder "today/tomorrow" classification — uses local tz, not UTC.
  //    At 11 PM Pacific on May 31, "today" in the user's tz is still May 31.
  //    UTC has rolled to June 1, but the reminder logic must not mis-label
  //    a shift ending earlier today as "tomorrow".
  // ─────────────────────────────────────────────────────────────────────
  it('Reminder "today" uses profile/shift tz, not server UTC', () => {
    const nowUtc = zonedWallClockToUtc('2026-05-31', '23:00', LA);
    // In LA this is 2026-05-31; in UTC this is 2026-06-01.
    expect(localYMD(nowUtc, LA)).toBe('2026-05-31');
    expect(nowUtc.toISOString().slice(0, 10)).toBe('2026-06-01');

    // A shift that ended at 4 PM the same Pacific day → ended < today (LA).
    const shiftEndUtc = zonedWallClockToUtc('2026-05-31', '16:00', LA);
    const shiftEndYMD = localYMD(shiftEndUtc, LA);
    const todayYMD = localYMD(nowUtc, LA);
    // It ended TODAY in LA — not yesterday — so it should NOT be flagged as
    // "ended before today" yet (which is the uninvoiced-shift criterion).
    expect(shiftEndYMD < todayYMD).toBe(false);
    expect(shiftEndYMD).toBe(todayYMD);

    // A shift that ended yesterday IS before today.
    const yesterdayEndUtc = zonedWallClockToUtc('2026-05-30', '20:00', LA);
    expect(localYMD(yesterdayEndUtc, LA) < todayYMD).toBe(true);
  });

  // ─────────────────────────────────────────────────────────────────────
  // 8) Facility tz edit protection — a shift with `timezone_at_creation`
  //    keeps its original local time even if the facility's tz is later
  //    changed.
  // ─────────────────────────────────────────────────────────────────────
  it('timezone_at_creation snapshot survives facility tz edits', () => {
    const shiftUtc = zonedWallClockToUtc('2026-05-15', '08:00', LA);
    const shiftRow = { id: 's1', start_datetime: shiftUtc.toISOString(), timezone_at_creation: LA };

    // Facility was Pacific when shift was created; now it's been edited to NY.
    const facilityNow = { id: 'f1', timezone: NY };
    const tz = resolveShiftTz(shiftRow, facilityNow, { timezone: null });
    expect(tz).toBe(LA); // snapshot wins
    expect(formatHHMMInTz(shiftRow.start_datetime, tz)).toBe('08:00');

    // Period assignment also stays in original tz.
    const b = periodBoundsUtc('monthly', shiftRow.start_datetime, tz);
    expect(b.startYMD).toBe('2026-05-01');

    // Without a snapshot the resolver falls through to the new facility tz.
    const noSnap = { id: 's2', start_datetime: shiftUtc.toISOString(), timezone_at_creation: null };
    expect(resolveShiftTz(noSnap, facilityNow, { timezone: null })).toBe(NY);
  });

  // Bonus: weekly + biweekly period math also lives in local tz.
  it('Weekly period for an 11 PM Sunday Pacific shift starts Monday-of-that-week local', () => {
    // 2026-05-31 is a Sunday. Weekly period is Mon..Sun.
    const shiftUtc = zonedWallClockToUtc('2026-05-31', '23:00', LA);
    const local = periodLocalBounds('weekly', shiftUtc, LA);
    expect(local.startYMD).toBe('2026-05-25'); // Monday
    expect(local.endYMD).toBe('2026-05-31'); // Sunday
    const b = periodBoundsUtc('weekly', shiftUtc, LA);
    expect(shiftUtc.getTime()).toBeLessThan(b.endUtcExclusive.getTime());
  });

  it('Biweekly period anchored to a Monday holds across UTC-rollover edges', () => {
    const shiftUtc = zonedWallClockToUtc('2026-05-31', '23:00', LA);
    const b = periodBoundsUtc('biweekly', shiftUtc, LA, '2026-01-05');
    // Period boundaries are 14-day windows from the anchor; the shift's local
    // YMD must fall inside [startYMD, endYMD].
    const localShiftYMD = localYMD(shiftUtc, LA);
    expect(localShiftYMD >= b.startYMD && localShiftYMD <= b.endYMD).toBe(true);
    expect(shiftUtc.getTime()).toBeLessThan(b.endUtcExclusive.getTime());
  });
});
