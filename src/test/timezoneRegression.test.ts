/**
 * Regression tests guarding against the "browser-tz drift" bug class.
 *
 * Bug history:
 *   A San Jose clinic shift saved as 8am–5pm local was being rendered to
 *   travelers (and to confirmation/reminder emails) in the browser's tz —
 *   so an 8am–5pm SJ shift showed up as "5:00 PM – 2:00 AM" for a user in
 *   Asia/Tokyo. The fix routed all wall-clock display through
 *   formatTimeInTz / formatDateInTz / getPartsInTz with the facility's tz.
 *
 * These tests pin the public helpers and the call patterns used by:
 *   - useClinicConfirmations (monthly + pre-shift email body/subject)
 *   - UpcomingShiftsCard      (Today/Tomorrow + time range, getRelativeDayInTz)
 *   - ThisWeekCard            ("EEE, MMM d · h:mm a" next-shift line)
 *   - BulkInvoiceDialog       (line-item description + service_date)
 *   - OnboardingShiftBuilder  (shift row date/time)
 *
 * The principle every assertion enforces: the rendered string must depend on
 * the FACILITY timezone, not on the runtime/browser timezone.
 */
import { describe, it, expect } from 'vitest';
import {
  formatTimeInTz,
  formatDateInTz,
  formatYMDInTz,
  getPartsInTz,
  getHoursInTz,
} from '@/lib/tzTime';
import { addDays } from 'date-fns';

// 2026-05-15T15:00:00Z
//   = 08:00 in America/Los_Angeles (PDT)
//   = 11:00 in America/New_York    (EDT)
//   = 17:00 in Europe/Berlin       (CEST)
//   = 00:00 next day in Asia/Tokyo (JST)
const ISO_15_UTC = '2026-05-15T15:00:00Z';
// SJ 8am–5pm shift, stored as the UTC equivalent of LA wall clock
const SJ_START = '2026-05-15T15:00:00Z'; // 8:00 AM PDT
const SJ_END   = '2026-05-16T00:00:00Z'; // 5:00 PM PDT

const TZ = {
  LA: 'America/Los_Angeles',
  NY: 'America/New_York',
  BERLIN: 'Europe/Berlin',
  TOKYO: 'Asia/Tokyo',
} as const;

// Mirror the local helper from UpcomingShiftsCard so we can regression-test
// the exact expression. Keep this in sync with the component.
function getRelativeDayInTz(iso: string, tz: string, now: Date): string {
  const parts = getPartsInTz(iso, tz);
  const today = getPartsInTz(now.toISOString(), tz);
  const tomorrow = getPartsInTz(addDays(now, 1).toISOString(), tz);
  if (parts.year === today.year && parts.month === today.month && parts.day === today.day) return 'Today';
  if (parts.year === tomorrow.year && parts.month === tomorrow.month && parts.day === tomorrow.day) return 'Tomorrow';
  return formatDateInTz(iso, tz, 'EEE, MMM d');
}

describe('Timezone regression — wall-clock displays must match facility tz', () => {
  describe('formatTimeInTz is stable across runtime tz', () => {
    it('SJ 8am–5pm shift renders as 8:00 AM – 5:00 PM in LA tz', () => {
      expect(formatTimeInTz(SJ_START, TZ.LA)).toBe('8:00 AM');
      expect(formatTimeInTz(SJ_END,   TZ.LA)).toBe('5:00 PM');
    });

    it('the same shift in Tokyo tz shows the Tokyo wall clock, not LA', () => {
      // Sanity: the helper does what its name says — viewer-tz output.
      // (Confirmation/dashboard code MUST always pass facility tz, never user tz.)
      expect(formatTimeInTz(SJ_START, TZ.TOKYO)).toBe('12:00 AM');
      expect(formatTimeInTz(SJ_END,   TZ.TOKYO)).toBe('9:00 AM');
    });

    it('produces identical output regardless of how the instant is represented', () => {
      expect(formatTimeInTz(new Date(SJ_START), TZ.LA))
        .toBe(formatTimeInTz(SJ_START, TZ.LA));
    });
  });

  describe('Confirmation emails (useClinicConfirmations)', () => {
    // Mirrors generateMonthlyBody / generatePreshiftBody construction.
    const buildShiftLine = (iso_start: string, iso_end: string, tz: string) =>
      `${formatDateInTz(iso_start, tz, 'EEE, MMM d')} — ${formatTimeInTz(iso_start, tz)} – ${formatTimeInTz(iso_end, tz)}`;

    it('monthly body line for SJ 8am–5pm shift formats in LA tz', () => {
      const line = buildShiftLine(SJ_START, SJ_END, TZ.LA);
      expect(line).toBe('Fri, May 15 — 8:00 AM – 5:00 PM');
      // The bug rendered "5:00 PM – 2:00 AM" or similar for travelers.
      expect(line).not.toMatch(/2:00 AM/);
    });

    it('pre-shift subject uses facility tz date, not UTC date', () => {
      // 2026-05-15T23:30:00Z = May 15 4:30 PM LA / May 16 8:30 AM Tokyo.
      // For an LA clinic the subject must say "May 15", never "May 16".
      const lateIso = '2026-05-15T23:30:00Z';
      expect(formatDateInTz(lateIso, TZ.LA, 'MMM d')).toBe('May 15');
      expect(formatDateInTz(lateIso, TZ.TOKYO, 'MMM d')).toBe('May 16');
    });

    it('pre-shift body date label uses facility-local weekday', () => {
      // Same instant; LA = Friday May 15, Tokyo = Saturday May 16.
      const iso = '2026-05-15T23:30:00Z';
      expect(formatDateInTz(iso, TZ.LA, 'EEEE, MMMM d, yyyy')).toBe('Friday, May 15, 2026');
      expect(formatDateInTz(iso, TZ.TOKYO, 'EEEE, MMMM d, yyyy')).toBe('Saturday, May 16, 2026');
    });
  });

  describe('Dashboard — UpcomingShiftsCard', () => {
    it('getRelativeDayInTz says "Today" for an LA-local same-day shift even when "now" is UTC late', () => {
      // Now: 2026-05-15 23:00 UTC = 4:00 PM LA = May 16 8:00 AM Tokyo.
      const now = new Date('2026-05-15T23:00:00Z');
      // Shift starts 1 hour later — same LA day.
      const shiftIso = '2026-05-16T00:30:00Z'; // 5:30 PM LA still May 15
      expect(getRelativeDayInTz(shiftIso, TZ.LA, now)).toBe('Today');
    });

    it('getRelativeDayInTz says "Tomorrow" relative to facility tz, not browser', () => {
      const now = new Date('2026-05-15T23:00:00Z'); // 4 PM LA, May 15
      const shiftIso = '2026-05-16T17:00:00Z';      // 10 AM LA, May 16
      expect(getRelativeDayInTz(shiftIso, TZ.LA, now)).toBe('Tomorrow');
    });

    it('time range renders facility-local hours (LA)', () => {
      const range = `${formatTimeInTz(SJ_START, TZ.LA)} - ${formatTimeInTz(SJ_END, TZ.LA)}`;
      expect(range).toBe('8:00 AM - 5:00 PM');
    });
  });

  describe('Dashboard — ThisWeekCard next-shift line', () => {
    it('renders "EEE, MMM d · h:mm a" in facility tz', () => {
      const tz = TZ.LA;
      const line = `${formatDateInTz(SJ_START, tz, 'EEE, MMM d')} · ${formatTimeInTz(SJ_START, tz)}`;
      expect(line).toBe('Fri, May 15 · 8:00 AM');
    });
  });

  describe('Invoices — BulkInvoiceDialog line items', () => {
    // Mirrors buildLineItemsForShift's description + service_date construction.
    it('description uses facility-local date and times', () => {
      const tz = TZ.LA;
      const description = `Relief shift ${formatDateInTz(SJ_START, tz, 'MMM d')} ${formatTimeInTz(SJ_START, tz)} – ${formatTimeInTz(SJ_END, tz)}`;
      expect(description).toContain('May 15');
      expect(description).toContain('8:00 AM');
      expect(description).toContain('5:00 PM');
    });

    it('service_date uses facility-local YMD, not UTC YMD', () => {
      // 11:30 PM LA on May 15 = May 16 in UTC. service_date must be May 15.
      const lateLocalIso = '2026-05-16T06:30:00Z';
      expect(formatYMDInTz(lateLocalIso, TZ.LA)).toBe('2026-05-15');
      // Naive UTC-based extraction (the old bug) would yield May 16.
      expect(lateLocalIso.slice(0, 10)).toBe('2026-05-16');
    });
  });

  describe('Onboarding — OnboardingShiftBuilder rows', () => {
    it('row date and time both use facility tz', () => {
      const tz = TZ.LA;
      const row = {
        date: formatDateInTz(SJ_START, tz, 'MMM d'),
        time: `${formatTimeInTz(SJ_START, tz)} – ${formatTimeInTz(SJ_END, tz)}`,
      };
      expect(row).toEqual({ date: 'May 15', time: '8:00 AM – 5:00 PM' });
    });
  });

  describe('Cross-tz invariants', () => {
    it('hour-of-day differs by tz for the same instant (sanity check on Intl)', () => {
      expect(getHoursInTz(ISO_15_UTC, TZ.LA)).toBe(8);
      expect(getHoursInTz(ISO_15_UTC, TZ.NY)).toBe(11);
      expect(getHoursInTz(ISO_15_UTC, TZ.BERLIN)).toBe(17);
      expect(getHoursInTz(ISO_15_UTC, TZ.TOKYO)).toBe(0);
    });

    it('formatTimeInTz never falls back to runtime tz (output depends only on the tz arg)', () => {
      // If a future refactor accidentally calls `format(new Date(iso), 'h:mm a')`,
      // the LA and Tokyo outputs would collapse to the same browser-local string.
      // Guard: they must differ for an instant that straddles midnight in Tokyo.
      const la = formatTimeInTz(SJ_START, TZ.LA);
      const tokyo = formatTimeInTz(SJ_START, TZ.TOKYO);
      expect(la).not.toBe(tokyo);
    });

    it('YMD differs across tz at UTC-midnight-adjacent instants', () => {
      const iso = '2026-05-16T06:30:00Z'; // late May 15 LA, mid May 16 Tokyo
      expect(formatYMDInTz(iso, TZ.LA)).toBe('2026-05-15');
      expect(formatYMDInTz(iso, TZ.TOKYO)).toBe('2026-05-16');
    });
  });
});
