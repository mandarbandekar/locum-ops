import { describe, it, expect } from 'vitest';
import {
  parseDateOnly,
  getQuarterRange,
  sumPaymentsInRange,
  sumShiftEarningsInRange,
  computeEstimatedQuarterlyTax,
} from '@/lib/dashboardCalculations';

describe('parseDateOnly', () => {
  it('parses YYYY-MM-DD as local time (no UTC drift)', () => {
    const d = parseDateOnly('2026-05-06');
    expect(d.getFullYear()).toBe(2026);
    expect(d.getMonth()).toBe(4);
    expect(d.getDate()).toBe(6);
    expect(d.getHours()).toBe(0);
  });

  it('falls back to Date constructor for non-date-only strings', () => {
    const d = parseDateOnly('2026-05-06T12:34:56Z');
    expect(d.getUTCFullYear()).toBe(2026);
  });
});

describe('getQuarterRange', () => {
  it('returns Q2 for May', () => {
    const r = getQuarterRange(new Date(2026, 4, 15));
    expect(r.quarter).toBe(2);
    expect(r.start.getMonth()).toBe(3); // April
    expect(r.start.getDate()).toBe(1);
    expect(r.end.getMonth()).toBe(5); // June
    expect(r.end.getDate()).toBe(30);
  });

  it('returns Q1 for January and Q4 for December', () => {
    expect(getQuarterRange(new Date(2026, 0, 5)).quarter).toBe(1);
    expect(getQuarterRange(new Date(2026, 11, 31)).quarter).toBe(4);
  });
});

describe('sumPaymentsInRange', () => {
  const payments = [
    { payment_date: '2026-04-01', amount: 100 },
    { payment_date: '2026-05-15', amount: 250 },
    { payment_date: '2026-06-30', amount: 50 },
    { payment_date: '2026-07-01', amount: 999 },
    { payment_date: '2026-03-31', amount: 999 },
  ];

  it('includes payments inside the quarter and excludes outside', () => {
    const { start, end } = getQuarterRange(new Date(2026, 4, 15));
    expect(sumPaymentsInRange(payments, start, end)).toBe(400);
  });

  it('uses local-time parsing so a 2026-04-01 payment lands in Q2', () => {
    const { start, end } = getQuarterRange(new Date(2026, 4, 15));
    expect(sumPaymentsInRange([{ payment_date: '2026-04-01', amount: 1 }], start, end)).toBe(1);
  });

  it('returns 0 with no payments', () => {
    expect(sumPaymentsInRange([], new Date(2026, 0, 1), new Date(2026, 11, 31))).toBe(0);
  });
});

describe('sumShiftEarningsInRange', () => {
  const shifts = [
    { end_datetime: '2026-04-02T18:00:00Z', rate_applied: 850 },
    { end_datetime: '2026-05-10T18:00:00Z', rate_applied: 900 },
    { end_datetime: '2026-06-29T18:00:00Z', rate_applied: 1000 },
    { end_datetime: '2026-07-02T18:00:00Z', rate_applied: 9999 },
    { end_datetime: '2026-05-20T18:00:00Z', rate_applied: null },
  ];

  it('sums rate_applied for shifts ending in the quarter', () => {
    const { start, end } = getQuarterRange(new Date(2026, 4, 15));
    expect(sumShiftEarningsInRange(shifts, start, end)).toBe(2750);
  });

  it('treats null rate_applied as zero', () => {
    expect(
      sumShiftEarningsInRange(
        [{ end_datetime: '2026-05-01T12:00:00Z', rate_applied: null }],
        new Date(2026, 3, 1),
        new Date(2026, 5, 30, 23, 59, 59),
      ),
    ).toBe(0);
  });

  it('returns 0 when no shifts fall in range', () => {
    expect(sumShiftEarningsInRange(shifts, new Date(2027, 0, 1), new Date(2027, 2, 31))).toBe(0);
  });
});

describe('computeEstimatedQuarterlyTax', () => {
  const baseArgs = {
    earnedThisQuarter: 20000,
    shifts: [],
    facilities: [],
    now: new Date(2026, 4, 15),
    getQuarterTotal: () => 0,
  };

  it('falls back to 25% heuristic when no tax profile', () => {
    const v = computeEstimatedQuarterlyTax({ ...baseArgs, taxProfile: null });
    expect(v).toBe(5000);
  });

  it('falls back to heuristic when profile has no setup_completed_at', () => {
    const v = computeEstimatedQuarterlyTax({
      ...baseArgs,
      taxProfile: { setup_completed_at: null },
    });
    expect(v).toBe(5000);
  });

  it('reads federal payments per quarter via getQuarterTotal', () => {
    const calls: Array<[string, string]> = [];
    computeEstimatedQuarterlyTax({
      ...baseArgs,
      taxProfile: { setup_completed_at: '2026-01-01' },
      getQuarterTotal: (q, t) => {
        calls.push([q, t]);
        return 0;
      },
    });
    // Even if calculator throws on this minimal profile, we still expect the
    // helper to have asked for all four quarters' federal_1040es totals.
    const expected = [
      ['Q1', 'federal_1040es'],
      ['Q2', 'federal_1040es'],
      ['Q3', 'federal_1040es'],
      ['Q4', 'federal_1040es'],
    ];
    expected.forEach(pair => {
      expect(calls).toContainEqual(pair);
    });
  });

  it('never throws — surfaces heuristic on calculator error', () => {
    const v = computeEstimatedQuarterlyTax({
      ...baseArgs,
      earnedThisQuarter: 8000,
      taxProfile: { setup_completed_at: '2026-01-01' }, // intentionally minimal
    });
    expect(typeof v).toBe('number');
    expect(v).toBeGreaterThanOrEqual(0);
  });
});
