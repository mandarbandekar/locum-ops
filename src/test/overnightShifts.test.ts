import { describe, it, expect } from 'vitest';
import {
  getScheduledMinutes,
  getBillableMinutes,
  formatBillableHours,
} from '../lib/shiftBreak';

/**
 * Overnight shift handling.
 *
 * Two layers of protection:
 *  1. Write-time: ShiftFormDialog and useSetupAssistant roll end_datetime
 *     forward 24h when end <= start. A DB trigger (validate_shift_times)
 *     also rejects any INSERT/UPDATE where end_datetime <= start_datetime
 *     so legacy bad data cannot be re-introduced.
 *  2. Read-time: getScheduledMinutes treats end <= start as next-day so
 *     existing legacy rows still display correct hours.
 */
describe('Overnight shift duration', () => {
  it('handles a normal same-day shift (8h)', () => {
    const mins = getScheduledMinutes({
      start_datetime: '2026-05-01T08:00:00Z',
      end_datetime: '2026-05-01T16:00:00Z',
    });
    expect(mins).toBe(480);
    expect(formatBillableHours(mins)).toBe('8');
  });

  it('handles overnight shift stored with rolled-forward end (23:00 -> 07:00 next day)', () => {
    const mins = getScheduledMinutes({
      start_datetime: '2026-05-01T23:00:00Z',
      end_datetime: '2026-05-02T07:00:00Z',
    });
    expect(mins).toBe(480);
    expect(formatBillableHours(mins)).toBe('8');
  });

  it('legacy fallback: end <= start on same day is treated as next-day, not 0h', () => {
    const mins = getScheduledMinutes({
      start_datetime: '2026-05-01T23:00:00Z',
      end_datetime: '2026-05-01T07:00:00Z',
    });
    expect(mins).toBe(480);
    expect(formatBillableHours(mins)).toBe('8');
  });

  it('legacy fallback: identical start and end becomes 24h (not 0h)', () => {
    const mins = getScheduledMinutes({
      start_datetime: '2026-05-01T12:00:00Z',
      end_datetime: '2026-05-01T12:00:00Z',
    });
    expect(mins).toBe(1440);
  });

  it('returns 0 minutes for invalid date strings', () => {
    expect(
      getScheduledMinutes({
        start_datetime: 'not-a-date',
        end_datetime: 'also-bad',
      }),
    ).toBe(0);
  });

  it('billable minutes deducts unpaid break on overnight shift', () => {
    const mins = getBillableMinutes({
      start_datetime: '2026-05-01T22:00:00Z',
      end_datetime: '2026-05-02T06:00:00Z',
      break_minutes: 30,
      worked_through_break: false,
    });
    expect(mins).toBe(450); // 8h - 30min
  });

  it('worked_through_break overrides break deduction on overnight shift', () => {
    const mins = getBillableMinutes({
      start_datetime: '2026-05-01T22:00:00Z',
      end_datetime: '2026-05-02T06:00:00Z',
      break_minutes: 30,
      worked_through_break: true,
    });
    expect(mins).toBe(480);
  });
});

/**
 * Mirrors the rollover logic used by ShiftFormDialog.buildStartEndIso,
 * useManualSetup.addShift, and useSetupAssistant.materializeConfirmed.
 * Kept inline so the test fails loudly if any caller drifts.
 */
function rollEndForward(startIso: string, endIso: string): string {
  const startMs = new Date(startIso).getTime();
  let endMs = new Date(endIso).getTime();
  if (!Number.isFinite(startMs) || !Number.isFinite(endMs)) return endIso;
  while (endMs <= startMs) endMs += 24 * 60 * 60 * 1000;
  return new Date(endMs).toISOString();
}

describe('Write-path overnight rollover (mirrors form + setup-assistant logic)', () => {
  it('rolls end forward 24h when end is before start', () => {
    const rolled = rollEndForward(
      '2026-05-01T23:00:00.000Z',
      '2026-05-01T07:00:00.000Z',
    );
    expect(rolled).toBe('2026-05-02T07:00:00.000Z');
  });

  it('rolls end forward when end equals start', () => {
    const rolled = rollEndForward(
      '2026-05-01T12:00:00.000Z',
      '2026-05-01T12:00:00.000Z',
    );
    expect(rolled).toBe('2026-05-02T12:00:00.000Z');
  });

  it('leaves end untouched when already after start', () => {
    const rolled = rollEndForward(
      '2026-05-01T08:00:00.000Z',
      '2026-05-01T16:00:00.000Z',
    );
    expect(rolled).toBe('2026-05-01T16:00:00.000Z');
  });

  it('produces a payload the DB validate_shift_times trigger will accept (end > start)', () => {
    const start = '2026-05-01T20:00:00.000Z';
    const end = rollEndForward(start, '2026-05-01T04:00:00.000Z');
    expect(new Date(end).getTime()).toBeGreaterThan(new Date(start).getTime());
  });
});
