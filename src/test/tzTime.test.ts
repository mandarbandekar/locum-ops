import { describe, it, expect } from 'vitest';
import {
  getHoursInTz,
  getMinutesInTz,
  isSameDayInTz,
  formatTimeInTz,
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
});
