import { describe, it, expect } from 'vitest';
import {
  getHoursInTz,
  getMinutesInTz,
  isSameDayInTz,
  formatTimeInTz,
  formatHHMMInTz,
  formatYMDInTz,
  zonedWallClockToUtc,
} from '@/lib/tzTime';

describe('tzTime helpers', () => {
  // 2026-05-01T15:20:00Z =
  //   08:20 in America/Los_Angeles (PDT, UTC-7)
  //   17:20 in Europe/Berlin       (CEST, UTC+2)
  //   00:20 next day in Asia/Tokyo (JST, UTC+9)
  const iso = '2026-05-01T15:20:00Z';

  it('getHoursInTz returns clinic-local hour, not browser hour', () => {
    expect(getHoursInTz(iso, 'America/Los_Angeles')).toBe(8);
    expect(getHoursInTz(iso, 'Europe/Berlin')).toBe(17);
    expect(getHoursInTz(iso, 'Asia/Tokyo')).toBe(0);
  });

  it('getMinutesInTz returns minute component', () => {
    expect(getMinutesInTz(iso, 'America/Los_Angeles')).toBe(20);
    expect(getMinutesInTz(iso, 'Asia/Tokyo')).toBe(20);
  });

  it('isSameDayInTz matches the calendar day in the given tz', () => {
    const may1 = new Date(2026, 4, 1);
    const may2 = new Date(2026, 4, 2);
    expect(isSameDayInTz(iso, may1, 'America/Los_Angeles')).toBe(true);
    expect(isSameDayInTz(iso, may1, 'Europe/Berlin')).toBe(true);
    // Tokyo has rolled to May 2 already
    expect(isSameDayInTz(iso, may1, 'Asia/Tokyo')).toBe(false);
    expect(isSameDayInTz(iso, may2, 'Asia/Tokyo')).toBe(true);
  });

  it('formatTimeInTz renders human time in the given tz', () => {
    expect(formatTimeInTz(iso, 'America/Los_Angeles')).toBe('8:20 AM');
    expect(formatTimeInTz(iso, 'Europe/Berlin')).toBe('5:20 PM');
  });

  it('handles midnight in tz cleanly (no "24")', () => {
    // 07:00 UTC -> 00:00 PDT
    const midnightPdt = '2026-07-01T07:00:00Z';
    expect(getHoursInTz(midnightPdt, 'America/Los_Angeles')).toBe(0);
  });

  it('accepts a Date instance as well as ISO string', () => {
    expect(getHoursInTz(new Date(iso), 'America/Los_Angeles')).toBe(8);
  });

  describe('zonedWallClockToUtc — the "traveler" fix', () => {
    it('interprets the wall clock in the given tz, not the runtime tz', () => {
      // "May 27, 8:00 AM in Los Angeles" -> 15:00 UTC during PDT
      const d = zonedWallClockToUtc('2026-05-27', '08:00', 'America/Los_Angeles');
      expect(d.toISOString()).toBe('2026-05-27T15:00:00.000Z');
    });

    it('round-trips: format(zonedWallClockToUtc(...)) returns the same wall clock', () => {
      const tz = 'America/Los_Angeles';
      const d = zonedWallClockToUtc('2026-05-27', '08:00', tz);
      expect(formatHHMMInTz(d, tz)).toBe('08:00');
      expect(formatYMDInTz(d, tz)).toBe('2026-05-27');
    });

    it('Praadnya bug: Italy user picking "May 27, 8 AM" for an LA clinic now stores May 27 in LA, not May 26', () => {
      // Before the fix, this got stored as 2026-05-27T06:00:00Z (= May 26, 11pm LA).
      const d = zonedWallClockToUtc('2026-05-27', '08:00', 'America/Los_Angeles');
      expect(formatYMDInTz(d, 'America/Los_Angeles')).toBe('2026-05-27');
      expect(getHoursInTz(d, 'America/Los_Angeles')).toBe(8);
    });

    it('handles DST forward in America/Los_Angeles (spring forward March 8 2026)', () => {
      // 2:30 AM PST doesn't exist on the DST jump day; engines collapse it.
      // We just verify the round-trip is stable on a non-skipped time.
      const d = zonedWallClockToUtc('2026-03-08', '04:00', 'America/Los_Angeles');
      expect(formatHHMMInTz(d, 'America/Los_Angeles')).toBe('04:00');
    });
  });
});
