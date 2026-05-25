// Pure helpers for computing billing-period boundaries in a clinic's local
// timezone. Extracted so we can unit-test the same logic the
// `generate-auto-invoices` edge function uses, without spinning up Deno.

import { zonedWallClockToUtc, getPartsInTz } from './tzTime';

export type Cadence = 'daily' | 'weekly' | 'biweekly' | 'monthly' | string;

function ymd(year: number, month: number, day: number): string {
  return `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
}

function addDaysYMD(dateStr: string, n: number): string {
  // Parse as UTC noon to dodge DST, then add days, then re-emit YMD.
  const [y, m, d] = dateStr.split('-').map(Number);
  const t = Date.UTC(y, m - 1, d, 12, 0, 0) + n * 86400000;
  const dt = new Date(t);
  return ymd(dt.getUTCFullYear(), dt.getUTCMonth() + 1, dt.getUTCDate());
}

function startOfWeekYMD(dateStr: string): string {
  // ISO-ish: Monday start, matching the existing Deno helper.
  const [y, m, d] = dateStr.split('-').map(Number);
  const dt = new Date(Date.UTC(y, m - 1, d));
  const day = dt.getUTCDay();
  const diff = (day === 0 ? -6 : 1) - day;
  return addDaysYMD(dateStr, diff);
}

function startOfMonthYMD(dateStr: string): string {
  const [y, m] = dateStr.split('-').map(Number);
  return ymd(y, m, 1);
}

function endOfMonthYMD(dateStr: string): string {
  const [y, m] = dateStr.split('-').map(Number);
  // day 0 of next month = last day of this month
  const dt = new Date(Date.UTC(y, m, 0));
  return ymd(dt.getUTCFullYear(), dt.getUTCMonth() + 1, dt.getUTCDate());
}

/**
 * Given a reference instant + a facility timezone, compute the clinic-local
 * billing-period bounds for that cadence as plain YYYY-MM-DD strings.
 */
export function periodLocalBounds(
  cadence: Cadence,
  refIso: string | Date,
  facilityTz: string,
  anchorDate?: string | null,
): { startYMD: string; endYMD: string } {
  const p = getPartsInTz(refIso, facilityTz);
  const refYMD = ymd(p.year, p.month, p.day);

  switch (cadence) {
    case 'daily':
      return { startYMD: refYMD, endYMD: refYMD };
    case 'weekly': {
      const start = startOfWeekYMD(refYMD);
      return { startYMD: start, endYMD: addDaysYMD(start, 6) };
    }
    case 'biweekly': {
      const anchor = anchorDate || '2026-01-01';
      // diff in days using UTC noon to dodge DST
      const [ay, am, ad] = anchor.split('-').map(Number);
      const [ry, rm, rd] = refYMD.split('-').map(Number);
      const aMs = Date.UTC(ay, am - 1, ad, 12);
      const rMs = Date.UTC(ry, rm - 1, rd, 12);
      const daysSince = Math.floor((rMs - aMs) / 86400000);
      const periodNum = Math.floor(daysSince / 14);
      const start = addDaysYMD(anchor, periodNum * 14);
      return { startYMD: start, endYMD: addDaysYMD(start, 13) };
    }
    case 'monthly':
    default:
      return { startYMD: startOfMonthYMD(refYMD), endYMD: endOfMonthYMD(refYMD) };
  }
}

/**
 * Convert clinic-local period bounds into a half-open UTC instant range
 * `[startUtc, endUtcExclusive)` suitable for `start_datetime >= X AND < Y`
 * Postgres queries. End is the first instant of the day AFTER the period end
 * in the clinic's tz, so a 11 PM Pacific shift on May 31 falls inside the May
 * period even though its UTC stamp is June 1.
 */
export function periodBoundsUtc(
  cadence: Cadence,
  refIso: string | Date,
  facilityTz: string,
  anchorDate?: string | null,
): { startUtc: Date; endUtcExclusive: Date; startYMD: string; endYMD: string } {
  const { startYMD, endYMD } = periodLocalBounds(cadence, refIso, facilityTz, anchorDate);
  const startUtc = zonedWallClockToUtc(startYMD, '00:00', facilityTz);
  const dayAfterEnd = addDaysYMD(endYMD, 1);
  const endUtcExclusive = zonedWallClockToUtc(dayAfterEnd, '00:00', facilityTz);
  return { startUtc, endUtcExclusive, startYMD, endYMD };
}

/** True if a UTC instant falls within a clinic-local YYYY-MM-DD calendar day. */
export function isShiftOnLocalDay(iso: string | Date, ymdStr: string, tz: string): boolean {
  const p = getPartsInTz(iso, tz);
  return ymd(p.year, p.month, p.day) === ymdStr;
}

/** Local YMD (in `tz`) for a UTC instant. */
export function localYMD(iso: string | Date, tz: string): string {
  const p = getPartsInTz(iso, tz);
  return ymd(p.year, p.month, p.day);
}
