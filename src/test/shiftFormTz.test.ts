import { describe, it, expect } from 'vitest';
import {
  zonedWallClockToUtc,
  formatHHMMInTz,
  formatYMDInTz,
  formatDateInTz,
} from '@/lib/tzTime';

// These tests verify the persistence + display contract used by ShiftFormDialog:
// wall-clock entries are saved as clinic-local instants and read back the same
// way regardless of the browser's timezone.

describe('shift form timezone defaults', () => {
  it('saves an LA 8:00 AM entry as the correct UTC instant', () => {
    const utc = zonedWallClockToUtc('2026-05-27', '08:00', 'America/Los_Angeles');
    // PDT is UTC-7 in late May
    expect(utc.toISOString()).toBe('2026-05-27T15:00:00.000Z');
  });

  it('round-trips through formatYMDInTz/formatHHMMInTz', () => {
    const utc = zonedWallClockToUtc('2026-05-27', '08:00', 'America/Los_Angeles');
    expect(formatYMDInTz(utc, 'America/Los_Angeles')).toBe('2026-05-27');
    expect(formatHHMMInTz(utc, 'America/Los_Angeles')).toBe('08:00');
  });

  it('keeping wall-clock when switching facility from LA to NY changes the UTC instant', () => {
    const la = zonedWallClockToUtc('2026-05-27', '08:00', 'America/Los_Angeles');
    const ny = zonedWallClockToUtc('2026-05-27', '08:00', 'America/New_York');
    // EDT is UTC-4 → 12:00Z; PDT is UTC-7 → 15:00Z
    expect(la.toISOString()).toBe('2026-05-27T15:00:00.000Z');
    expect(ny.toISOString()).toBe('2026-05-27T12:00:00.000Z');
  });

  it('handles DST spring-forward in LA on 2026-03-08 deterministically', () => {
    // 02:30 falls in the skipped hour. Our helper resolves it to a stable
    // instant; we just verify the round-trip stays on the same calendar day
    // and produces a wall-clock that matches what the user will see back.
    const utc = zonedWallClockToUtc('2026-03-08', '02:30', 'America/Los_Angeles');
    expect(formatYMDInTz(utc, 'America/Los_Angeles')).toBe('2026-03-08');
    const hhmm = formatHHMMInTz(utc, 'America/Los_Angeles');
    expect(['01:30', '03:30']).toContain(hhmm);
  });

  it('formats conflict pill dates in the conflicting facility timezone', () => {
    // Conflict at 11:30 PM clinic-local on May 27 in NY → render shows "May 27"
    const start = zonedWallClockToUtc('2026-05-27', '23:30', 'America/New_York');
    expect(formatDateInTz(start, 'America/New_York', 'MMM d, h:mm a'))
      .toBe('May 27, 11:30 PM');
  });
});
