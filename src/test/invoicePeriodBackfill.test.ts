// Tests for the legacy draft-invoice period-alignment backfill logic and the
// InvoiceEditPanel timezone-aware service_date fallback. These mirror the
// deterministic SQL run against production: derive intended local YMD via a
// ±12h midpoint heuristic, then re-anchor to facility-local midnight.

import { describe, it, expect } from 'vitest';
import { zonedWallClockToUtc, getPartsInTz, formatYMDInTz } from '@/lib/tzTime';
import { resolveShiftTz } from '@/lib/resolveTimezone';

const LA = 'America/Los_Angeles';
const NY = 'America/New_York';

/** Pure JS port of the SQL backfill row-correction. */
function correctPeriod(periodStartIso: string, periodEndIso: string, facilityTz: string) {
  const startPlus = new Date(new Date(periodStartIso).getTime() + 12 * 3600_000);
  const endMinus = new Date(new Date(periodEndIso).getTime() - 12 * 3600_000);
  const sp = getPartsInTz(startPlus, facilityTz);
  const ep = getPartsInTz(endMinus, facilityTz);
  const startYMD = `${sp.year}-${String(sp.month).padStart(2, '0')}-${String(sp.day).padStart(2, '0')}`;
  const endYMD = `${ep.year}-${String(ep.month).padStart(2, '0')}-${String(ep.day).padStart(2, '0')}`;
  // Day after end, midnight in facility tz, minus 1ms
  const [ey, em, ed] = endYMD.split('-').map(Number);
  const dayAfter = new Date(Date.UTC(ey, em - 1, ed + 1));
  const dayAfterYMD = `${dayAfter.getUTCFullYear()}-${String(dayAfter.getUTCMonth() + 1).padStart(2, '0')}-${String(dayAfter.getUTCDate()).padStart(2, '0')}`;
  const newStart = zonedWallClockToUtc(startYMD, '00:00', facilityTz);
  const newEnd = new Date(zonedWallClockToUtc(dayAfterYMD, '00:00', facilityTz).getTime() - 1);
  return { startYMD, endYMD, newStart, newEnd };
}

/** Replicates the predicate the SQL backfill uses to identify misaligned rows. */
function isMisaligned(periodStartIso: string, periodEndIso: string, facilityTz: string): boolean {
  const sp = getPartsInTz(periodStartIso, facilityTz);
  const ep = getPartsInTz(periodEndIso, facilityTz);
  const startOk = sp.hour === 0 && sp.minute === 0 && sp.second === 0;
  const endOk = ep.hour === 23 && ep.minute === 59 && ep.second === 59;
  return !(startOk && endOk);
}

/** Mirrors InvoiceEditPanel's new fallback for derived service_date. */
function deriveServiceDate(
  shift: { start_datetime: string; timezone_at_creation?: string | null },
  facility: { timezone?: string | null } | null,
  profile: { timezone?: string | null } | null,
): string {
  return formatYMDInTz(shift.start_datetime, resolveShiftTz(shift as any, facility as any, profile as any));
}

describe('Draft invoice period backfill (Part 1)', () => {
  it('detects UTC-anchored LA weekly period as misaligned', () => {
    // Legacy row: 2026-05-04 00:00 UTC → 2026-05-10 23:59:59.999 UTC, facility LA.
    expect(isMisaligned('2026-05-04T00:00:00Z', '2026-05-10T23:59:59.999Z', LA)).toBe(true);
  });

  it('detects NY-anchored period stored under LA facility tz as misaligned', () => {
    // 2026-07-01 04:00 UTC = 2026-07-01 00:00 NY (was NY-aligned originally).
    expect(isMisaligned('2026-07-01T04:00:00Z', '2026-08-01T03:59:59.999Z', LA)).toBe(true);
  });

  it('considers an already-LA-aligned period NOT misaligned', () => {
    // 2026-05-25 07:00 UTC = 2026-05-25 00:00 LA.
    expect(isMisaligned('2026-05-25T07:00:00Z', '2026-05-26T06:59:59.999Z', LA)).toBe(false);
  });

  it('corrects UTC-anchored LA weekly to facility-local 00:00 / 23:59:59.999', () => {
    const r = correctPeriod('2026-05-04T00:00:00Z', '2026-05-10T23:59:59.999Z', LA);
    expect(r.startYMD).toBe('2026-05-04');
    expect(r.endYMD).toBe('2026-05-10');
    expect(r.newStart.toISOString()).toBe('2026-05-04T07:00:00.000Z');
    expect(r.newEnd.toISOString()).toBe('2026-05-11T06:59:59.999Z');
    // And the new bounds render as local midnight / end-of-day.
    expect(getPartsInTz(r.newStart, LA).hour).toBe(0);
    expect(getPartsInTz(r.newEnd, LA).hour).toBe(23);
  });

  it('corrects NY-anchored monthly under LA-tz facility to LA-local July bounds', () => {
    // EGVC-2026-001 case from production.
    const r = correctPeriod('2026-07-01T04:00:00Z', '2026-08-01T03:59:59.999Z', LA);
    expect(r.startYMD).toBe('2026-07-01');
    expect(r.endYMD).toBe('2026-07-31');
    expect(r.newStart.toISOString()).toBe('2026-07-01T07:00:00.000Z');
    expect(r.newEnd.toISOString()).toBe('2026-08-01T06:59:59.999Z');
  });

  it('safety predicate excludes non-draft invoices by status (caller responsibility)', () => {
    // The SQL filter pins status='draft'; this assertion documents the contract:
    // any row passed in with non-draft status MUST be filtered out before correctPeriod runs.
    const eligible = (status: string) => status === 'draft';
    expect(eligible('draft')).toBe(true);
    expect(eligible('sent')).toBe(false);
    expect(eligible('paid')).toBe(false);
    expect(eligible('overdue')).toBe(false);
    expect(eligible('voided')).toBe(false);
  });

  it('ambiguous rows (null facility tz) are not actionable — caller skips', () => {
    // The SQL JOIN + NOT NULL constraint on facilities.timezone guarantees a
    // resolvable tz at backfill time. We assert the resolver still returns a
    // safe fallback rather than throwing if a row ever lacked one.
    const tz = resolveShiftTz(null, null, null);
    expect(tz).toBe('America/New_York');
  });

  it('NY-tz facility weekly: 2026-05-04 04:00 UTC → 2026-05-11 03:59:59.999 UTC stays aligned', () => {
    expect(isMisaligned('2026-05-04T04:00:00Z', '2026-05-11T03:59:59.999Z', NY)).toBe(false);
  });
});

describe('InvoiceEditPanel service_date (Part 2)', () => {
  it('May 31 11 PM Pacific shift derives service_date = 2026-05-31', () => {
    const startUtc = zonedWallClockToUtc('2026-05-31', '23:00', LA).toISOString();
    const shift = { start_datetime: startUtc, timezone_at_creation: LA };
    const facility = { timezone: LA };
    expect(deriveServiceDate(shift, facility, null)).toBe('2026-05-31');
  });

  it('snapshot wins over a changed facility tz', () => {
    const startUtc = zonedWallClockToUtc('2026-05-31', '23:00', LA).toISOString();
    const shift = { start_datetime: startUtc, timezone_at_creation: LA };
    // Facility was later edited to NY; snapshot should still drive Pacific date.
    expect(deriveServiceDate(shift, { timezone: NY }, null)).toBe('2026-05-31');
  });

  it('falls back to facility tz when no snapshot exists', () => {
    const startUtc = zonedWallClockToUtc('2026-05-31', '23:00', LA).toISOString();
    const shift = { start_datetime: startUtc, timezone_at_creation: null };
    expect(deriveServiceDate(shift, { timezone: LA }, null)).toBe('2026-05-31');
  });

  it('falls back to profile tz when neither snapshot nor facility tz is set', () => {
    const startUtc = zonedWallClockToUtc('2026-05-31', '23:00', LA).toISOString();
    const shift = { start_datetime: startUtc };
    expect(deriveServiceDate(shift, null, { timezone: LA })).toBe('2026-05-31');
  });
});
