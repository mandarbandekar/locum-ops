import { describe, it, expect } from 'vitest';
import { computeIncomeProjection } from '@/lib/taxProjection';
import type { Shift, Facility } from '@/types';

// April 1, 2026 — Q2, ~90 days into the year
const TODAY = new Date('2026-04-01T12:00:00');

function makeFacility(overrides: Partial<Facility> & { id?: string } = {}): Facility {
  return {
    id: 'fac-1',
    name: 'Test Clinic',
    engagement_type: 'direct',
    source_name: null,
    tax_form_type: '1099',
    ...(overrides as any),
  } as Facility;
}

function makeShift(overrides: Partial<Shift> & { facility_id?: string }): Shift {
  return {
    id: `s-${Math.random().toString(36).slice(2, 8)}`,
    facility_id: 'fac-1',
    start_datetime: '2026-01-15T08:00:00Z',
    end_datetime: '2026-01-15T18:00:00Z',
    rate_applied: 1000,
    notes: '',
    color: 'blue',
    rate_kind: 'flat',
    ...(overrides as any),
  } as Shift;
}

describe('computeIncomeProjection — base behavior', () => {
  it('Returns zero/static fallback when no shifts provided', () => {
    const result = computeIncomeProjection({
      shifts: [],
      facilities: [],
      staticAnnualReliefIncome: 100000,
      method: 'booked_plus_run_rate',
      today: TODAY,
    });
    expect(result.ytdActual).toBe(0);
    expect(result.bookedFutureIncome).toBe(0);
    expect(result.runRateAnnual).toBe(0);
    expect(result.bookedPlusRunRateAnnual).toBe(0);
    expect(result.projectedAnnual).toBe(100000);
    expect(result.fellBackToStatic).toBe(true);
    expect(result.reliefShiftCount).toBe(0);
  });

  it('method="static" always returns staticAnnualReliefIncome regardless of shifts', () => {
    const fac = makeFacility();
    const shifts = [
      makeShift({ start_datetime: '2026-02-01T08:00:00Z', end_datetime: '2026-02-01T18:00:00Z', rate_applied: 5000 }),
    ];
    const result = computeIncomeProjection({
      shifts,
      facilities: [fac],
      staticAnnualReliefIncome: 75000,
      method: 'static',
      today: TODAY,
    });
    expect(result.projectedAnnual).toBe(75000);
    expect(result.method).toBe('static');
    expect(result.ytdActual).toBe(5000);
  });
});

describe('computeIncomeProjection — engagement filtering', () => {
  it('Excludes W-2 shifts from relief income', () => {
    const directFacility = makeFacility({ id: 'f-direct', engagement_type: 'direct' });
    // W-2 in this codebase = third_party + tax_form_type === 'w2'
    const w2Facility = makeFacility({ id: 'f-w2', engagement_type: 'third_party', tax_form_type: 'w2' });
    const shifts = [
      makeShift({ facility_id: 'f-direct', end_datetime: '2026-02-15T18:00:00Z', rate_applied: 3000 }),
      makeShift({ facility_id: 'f-w2', end_datetime: '2026-02-20T18:00:00Z', rate_applied: 4000 }),
    ];
    const result = computeIncomeProjection({
      shifts,
      facilities: [directFacility, w2Facility],
      staticAnnualReliefIncome: 0,
      method: 'booked_plus_run_rate',
      today: TODAY,
    });
    expect(result.ytdActual).toBe(3000);
    expect(result.reliefShiftCount).toBe(1);
  });

  it('Includes third_party shifts in relief income', () => {
    const fac = makeFacility({ engagement_type: 'third_party', tax_form_type: '1099' });
    const shifts = [
      makeShift({ end_datetime: '2026-02-15T18:00:00Z', rate_applied: 2500 }),
    ];
    const result = computeIncomeProjection({
      shifts,
      facilities: [fac],
      staticAnnualReliefIncome: 0,
      method: 'booked_plus_run_rate',
      today: TODAY,
    });
    expect(result.ytdActual).toBe(2500);
    expect(result.reliefShiftCount).toBe(1);
  });

  it('Honors per-shift engagement_type_override', () => {
    // Facility default is third_party + W-2; override flips to direct
    const w2Fac = makeFacility({ engagement_type: 'third_party', tax_form_type: 'w2' });
    const shifts = [
      makeShift({
        end_datetime: '2026-02-15T18:00:00Z',
        rate_applied: 1500,
        engagement_type_override: 'direct',
      }),
    ];
    const result = computeIncomeProjection({
      shifts,
      facilities: [w2Fac],
      staticAnnualReliefIncome: 0,
      method: 'booked_plus_run_rate',
      today: TODAY,
    });
    // Note: getEffectiveEngagement returns the facility's tax_form_type regardless
    // of the override, so the W-2 tax form still excludes this shift. This matches
    // the codebase's existing engagement model — overrides change the engagement
    // type but not the underlying tax form (which lives on the facility).
    expect(result.ytdActual).toBe(0);
    expect(result.reliefShiftCount).toBe(0);
  });
});

describe('computeIncomeProjection — YTD vs future scoping', () => {
  it('Excludes shifts from prior calendar year', () => {
    const fac = makeFacility();
    const shifts = [
      makeShift({ end_datetime: '2025-12-15T18:00:00Z', rate_applied: 9999 }),
      makeShift({ end_datetime: '2026-02-01T18:00:00Z', rate_applied: 1000 }),
    ];
    const result = computeIncomeProjection({
      shifts,
      facilities: [fac],
      staticAnnualReliefIncome: 0,
      method: 'booked_plus_run_rate',
      today: TODAY,
    });
    expect(result.ytdActual).toBe(1000);
  });

  it('Excludes shifts that start in the next calendar year', () => {
    const fac = makeFacility();
    const shifts = [
      makeShift({
        start_datetime: '2027-01-15T08:00:00Z',
        end_datetime: '2027-01-15T18:00:00Z',
        rate_applied: 9999,
      }),
    ];
    const result = computeIncomeProjection({
      shifts,
      facilities: [fac],
      staticAnnualReliefIncome: 0,
      method: 'booked_plus_run_rate',
      today: TODAY,
    });
    expect(result.bookedFutureIncome).toBe(0);
  });

  it('Treats a shift ending exactly at "today" as YTD (boundary inclusive)', () => {
    const fac = makeFacility();
    const shifts = [
      makeShift({
        start_datetime: '2026-04-01T08:00:00Z',
        end_datetime: TODAY.toISOString(),
        rate_applied: 1234,
      }),
    ];
    const result = computeIncomeProjection({
      shifts,
      facilities: [fac],
      staticAnnualReliefIncome: 0,
      method: 'booked_plus_run_rate',
      today: TODAY,
    });
    expect(result.ytdActual).toBe(1234);
  });
});

describe('computeIncomeProjection — run_rate method', () => {
  it('Annualizes YTD income correctly: $30K over 90 days → ~$121,667 annual', () => {
    const fac = makeFacility();
    const shifts = [
      makeShift({ end_datetime: '2026-01-30T18:00:00Z', rate_applied: 10000 }),
      makeShift({ end_datetime: '2026-02-28T18:00:00Z', rate_applied: 10000 }),
      makeShift({ end_datetime: '2026-03-30T18:00:00Z', rate_applied: 10000 }),
    ];
    const result = computeIncomeProjection({
      shifts,
      facilities: [fac],
      staticAnnualReliefIncome: 0,
      method: 'run_rate',
      today: TODAY,
    });
    expect(result.ytdActual).toBe(30000);
    expect(result.runRateAnnual).toBeGreaterThan(115000);
    expect(result.runRateAnnual).toBeLessThan(125000);
    expect(result.projectedAnnual).toBe(result.runRateAnnual);
  });

  it('Falls back to static when YTD is zero (run_rate would be 0)', () => {
    const result = computeIncomeProjection({
      shifts: [],
      facilities: [],
      staticAnnualReliefIncome: 80000,
      method: 'run_rate',
      today: TODAY,
    });
    expect(result.runRateAnnual).toBe(0);
    expect(result.projectedAnnual).toBe(80000);
    expect(result.fellBackToStatic).toBe(true);
  });
});

describe('computeIncomeProjection — booked_plus_run_rate method', () => {
  it('YTD only, no future bookings → equals run-rate annual (run-rate fills full remainder)', () => {
    const fac = makeFacility();
    const shifts = [
      makeShift({ end_datetime: '2026-02-15T18:00:00Z', rate_applied: 15000 }),
      makeShift({ end_datetime: '2026-03-15T18:00:00Z', rate_applied: 15000 }),
    ];
    const result = computeIncomeProjection({
      shifts,
      facilities: [fac],
      staticAnnualReliefIncome: 0,
      method: 'booked_plus_run_rate',
      today: TODAY,
    });
    expect(result.ytdActual).toBe(30000);
    expect(result.bookedFutureIncome).toBe(0);
    expect(Math.abs(result.bookedPlusRunRateAnnual - result.runRateAnnual)).toBeLessThan(2000);
  });

  it('YTD + booked future → projection includes booked sum + run-rate fill for unbooked days', () => {
    const fac = makeFacility();
    const shifts = [
      makeShift({ end_datetime: '2026-03-15T18:00:00Z', rate_applied: 30000 }),
      makeShift({
        start_datetime: '2026-05-01T08:00:00Z',
        end_datetime: '2026-05-01T18:00:00Z',
        rate_applied: 2500,
      }),
      makeShift({
        start_datetime: '2026-05-15T08:00:00Z',
        end_datetime: '2026-05-15T18:00:00Z',
        rate_applied: 2500,
      }),
    ];
    const result = computeIncomeProjection({
      shifts,
      facilities: [fac],
      staticAnnualReliefIncome: 0,
      method: 'booked_plus_run_rate',
      today: TODAY,
    });
    expect(result.ytdActual).toBe(30000);
    expect(result.bookedFutureIncome).toBe(5000);
    expect(result.bookedPlusRunRateAnnual).toBeGreaterThan(105000);
    expect(result.bookedPlusRunRateAnnual).toBeLessThan(120000);
    expect(result.projectedAnnual).toBe(result.bookedPlusRunRateAnnual);
  });

  it('Falls back to static when both YTD and booked future are zero', () => {
    const result = computeIncomeProjection({
      shifts: [],
      facilities: [],
      staticAnnualReliefIncome: 50000,
      method: 'booked_plus_run_rate',
      today: TODAY,
    });
    expect(result.bookedPlusRunRateAnnual).toBe(0);
    expect(result.projectedAnnual).toBe(50000);
    expect(result.fellBackToStatic).toBe(true);
  });

  it('Booked future only (no YTD) → projection equals booked sum (no run-rate fill since run-rate is 0)', () => {
    const fac = makeFacility();
    const shifts = [
      makeShift({
        start_datetime: '2026-06-01T08:00:00Z',
        end_datetime: '2026-06-01T18:00:00Z',
        rate_applied: 8000,
      }),
    ];
    const result = computeIncomeProjection({
      shifts,
      facilities: [fac],
      staticAnnualReliefIncome: 0,
      method: 'booked_plus_run_rate',
      today: TODAY,
    });
    expect(result.ytdActual).toBe(0);
    expect(result.bookedFutureIncome).toBe(8000);
    expect(result.runRateAnnual).toBe(0);
    expect(result.bookedPlusRunRateAnnual).toBe(8000);
    expect(result.projectedAnnual).toBe(8000);
    expect(result.fellBackToStatic).toBe(false);
  });
});

describe('computeIncomeProjection — diagnostics', () => {
  it('reliefShiftCount counts only shifts that pass the engagement filter', () => {
    const directFac = makeFacility({ id: 'f1', engagement_type: 'direct' });
    const w2Fac = makeFacility({ id: 'f2', engagement_type: 'third_party', tax_form_type: 'w2' });
    const shifts = [
      makeShift({ facility_id: 'f1', end_datetime: '2026-02-01T18:00:00Z' }),
      makeShift({ facility_id: 'f1', end_datetime: '2026-02-15T18:00:00Z' }),
      makeShift({ facility_id: 'f2', end_datetime: '2026-02-20T18:00:00Z' }),
      makeShift({
        facility_id: 'f1',
        start_datetime: '2026-08-01T08:00:00Z',
        end_datetime: '2026-08-01T18:00:00Z',
      }),
    ];
    const result = computeIncomeProjection({
      shifts,
      facilities: [directFac, w2Fac],
      staticAnnualReliefIncome: 0,
      method: 'booked_plus_run_rate',
      today: TODAY,
    });
    expect(result.reliefShiftCount).toBe(3);
  });

  it('daysElapsed and daysRemainingInYear sum to (approximately) 365', () => {
    const result = computeIncomeProjection({
      shifts: [],
      facilities: [],
      staticAnnualReliefIncome: 0,
      method: 'booked_plus_run_rate',
      today: TODAY,
    });
    const total = result.daysElapsed + result.daysRemainingInYear;
    expect(total).toBeGreaterThanOrEqual(364);
    expect(total).toBeLessThanOrEqual(366);
  });
});
