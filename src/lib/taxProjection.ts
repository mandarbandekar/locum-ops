/**
 * Tax income projection engine.
 *
 * Computes annual relief income from a user's logged + scheduled shifts.
 * Pure functions — no React, no Supabase, no side effects.
 *
 * Three methods:
 *   - 'static'               → use the user's manual annual_relief_income override
 *   - 'run_rate'             → annualize YTD income (YTD / daysElapsed × 365)
 *   - 'booked_plus_run_rate' → YTD + booked future shifts + run-rate fill for unbooked days
 *
 * Status field on shifts is intentionally ignored — we use date-based detection
 * (end_datetime <= today → logged; start_datetime > today → scheduled).
 */

import type { Shift, Facility } from '@/types';
import { getEffectiveEngagement } from './engagementOptions';

export type ProjectionMethod = 'static' | 'run_rate' | 'booked_plus_run_rate';

export interface ProjectionInput {
  shifts: Shift[];
  facilities: Facility[];
  staticAnnualReliefIncome: number;
  method: ProjectionMethod;
  today: Date;
}

export interface ProjectionResult {
  method: ProjectionMethod;
  ytdActual: number;
  bookedFutureIncome: number;
  runRateAnnual: number;
  bookedPlusRunRateAnnual: number;
  projectedAnnual: number;
  daysElapsed: number;
  daysRemainingInYear: number;
  reliefShiftCount: number;
  fellBackToStatic: boolean;
}

/**
 * A shift counts toward 1099 relief income when its effective engagement is
 * direct or third_party AND its tax form is NOT a W-2. W-2 income is tracked
 * separately via `other_w2_income` (aggregating W-2 shifts into that field is
 * a future enhancement; out of scope for Prompt 4C).
 */
function filterReliefShifts(shifts: Shift[], facilities: Facility[]): Shift[] {
  const facilityById = new Map(facilities.map(f => [f.id, f]));
  return shifts.filter(s => {
    const facility = facilityById.get(s.facility_id);
    if (!facility) return false;
    const eff = getEffectiveEngagement(s, facility);
    // Exclude W-2 shifts — they belong to the W-2 income bucket, not 1099 relief.
    if (eff.tax_form_type === 'w2') return false;
    // Forward-compat: if a future engagement_type 'w2' is ever introduced, exclude it.
    if ((eff.engagement_type as string) === 'w2') return false;
    return eff.engagement_type === 'direct' || eff.engagement_type === 'third_party';
  });
}

function startOfYear(d: Date): Date {
  return new Date(d.getFullYear(), 0, 1);
}

function endOfYear(d: Date): Date {
  return new Date(d.getFullYear(), 11, 31, 23, 59, 59, 999);
}

function diffDays(later: Date, earlier: Date): number {
  const ms = later.getTime() - earlier.getTime();
  return Math.max(0, Math.floor(ms / (1000 * 60 * 60 * 24)));
}

function sumIncome(shifts: Shift[], predicate: (s: Shift) => boolean): number {
  return shifts
    .filter(predicate)
    .reduce((acc, s) => acc + (Number(s.rate_applied) || 0), 0);
}

/**
 * Main entry point. Always returns a ProjectionResult — never throws.
 */
export function computeIncomeProjection(input: ProjectionInput): ProjectionResult {
  const { shifts, facilities, staticAnnualReliefIncome, method, today } = input;

  const yearStart = startOfYear(today);
  const yearEnd = endOfYear(today);
  const daysElapsed = Math.max(1, diffDays(today, yearStart));
  const daysRemainingInYear = Math.max(0, diffDays(yearEnd, today));

  const reliefShifts = filterReliefShifts(shifts, facilities);

  // YTD: end_datetime is in current year AND <= today
  const ytdActual = Math.round(sumIncome(reliefShifts, s => {
    const end = new Date(s.end_datetime);
    return end >= yearStart && end <= today;
  }));

  // Booked future: start_datetime > today AND in current year
  const bookedFutureIncome = Math.round(sumIncome(reliefShifts, s => {
    const start = new Date(s.start_datetime);
    return start > today && start <= yearEnd;
  }));

  // Run-rate annual
  const runRateDaily = ytdActual / daysElapsed;
  const runRateAnnual = Math.round(runRateDaily * 365);

  // Booked + run-rate fill: fill from latest booked end (or today) to year-end
  let lastBookedEnd: Date = today;
  const futureRelief = reliefShifts.filter(s => new Date(s.start_datetime) > today);
  for (const s of futureRelief) {
    const end = new Date(s.end_datetime);
    if (end > lastBookedEnd && end <= yearEnd) {
      lastBookedEnd = end;
    }
  }
  const fillDays = Math.max(0, diffDays(yearEnd, lastBookedEnd));
  const runRateFill = Math.round(runRateDaily * fillDays);
  const bookedPlusRunRateAnnual = ytdActual + bookedFutureIncome + runRateFill;

  // Pick the projection per method, falling back to static when computed = 0
  let projectedAnnual: number;
  let fellBackToStatic = false;

  if (method === 'static') {
    projectedAnnual = staticAnnualReliefIncome;
  } else if (method === 'run_rate') {
    if (runRateAnnual <= 0) {
      projectedAnnual = staticAnnualReliefIncome;
      fellBackToStatic = true;
    } else {
      projectedAnnual = runRateAnnual;
    }
  } else {
    if (bookedPlusRunRateAnnual <= 0) {
      projectedAnnual = staticAnnualReliefIncome;
      fellBackToStatic = true;
    } else {
      projectedAnnual = bookedPlusRunRateAnnual;
    }
  }

  return {
    method,
    ytdActual,
    bookedFutureIncome,
    runRateAnnual,
    bookedPlusRunRateAnnual,
    projectedAnnual,
    daysElapsed,
    daysRemainingInYear,
    reliefShiftCount: reliefShifts.length,
    fellBackToStatic,
  };
}
