/**
 * Pure helpers used by DashboardPage so tax / earnings / payment-date math
 * can be unit-tested in isolation.
 */
import { calculateTaxV1, mapDbProfileToV1 } from '@/lib/taxCalculatorV1';

/** Parse a 'YYYY-MM-DD' (date-only) string in local time to avoid UTC drift. */
export function parseDateOnly(s: string): Date {
  const m = /^(\d{4})-(\d{2})-(\d{2})/.exec(s);
  if (m) return new Date(Number(m[1]), Number(m[2]) - 1, Number(m[3]));
  return new Date(s);
}

export interface QuarterRange {
  quarter: number;
  start: Date;
  end: Date;
}

/** Local-time start/end of the calendar quarter that contains `now`. */
export function getQuarterRange(now: Date): QuarterRange {
  const month = now.getMonth();
  const quarter = Math.floor(month / 3) + 1;
  const start = new Date(now.getFullYear(), (quarter - 1) * 3, 1);
  const end = new Date(now.getFullYear(), quarter * 3, 0, 23, 59, 59);
  return { quarter, start, end };
}

/**
 * Sum payments whose `payment_date` (date-only string) falls in [start, end].
 * Used for both "collected this month" and "collected this quarter".
 */
export function sumPaymentsInRange(
  payments: Array<{ payment_date: string; amount: number }>,
  start: Date,
  end: Date,
): number {
  return payments
    .filter(p => {
      const d = parseDateOnly(p.payment_date);
      return d >= start && d <= end;
    })
    .reduce((s, p) => s + p.amount, 0);
}

/**
 * Sum `rate_applied` for shifts that ended in [start, end].
 * Drives "earned this quarter" and the quarter-stats earnings figure.
 */
export function sumShiftEarningsInRange(
  shifts: Array<{ end_datetime: string; rate_applied?: number | null }>,
  start: Date,
  end: Date,
): number {
  return shifts
    .filter(s => {
      const d = new Date(s.end_datetime);
      return d >= start && d <= end;
    })
    .reduce((sum, s) => sum + (s.rate_applied || 0), 0);
}

/**
 * Compute the recommended quarterly federal payment using `calculateTaxV1`
 * when a tax profile exists, falling back to a 25% heuristic of earnings.
 *
 * Quarterly federal payments come from `tax_payment_logs` via the supplied
 * `getQuarterTotal` callback so the calculator's safe-harbor logic sees the
 * same source of truth as the rest of the app.
 */
export function computeEstimatedQuarterlyTax(args: {
  earnedThisQuarter: number;
  taxProfile: any | null;
  shifts: any[];
  facilities: any[];
  now: Date;
  getQuarterTotal: (quarter: string, paymentType: string) => number;
}): number {
  const { earnedThisQuarter, taxProfile, shifts, facilities, now, getQuarterTotal } = args;
  let estimate = Math.round(earnedThisQuarter * 0.25);
  if (taxProfile?.setup_completed_at) {
    try {
      const v1 = mapDbProfileToV1(taxProfile, {
        shifts,
        facilities,
        today: now,
        quarterlyPaymentsPaid: {
          q1: getQuarterTotal('Q1', 'federal_1040es'),
          q2: getQuarterTotal('Q2', 'federal_1040es'),
          q3: getQuarterTotal('Q3', 'federal_1040es'),
          q4: getQuarterTotal('Q4', 'federal_1040es'),
        },
      });
      const result = calculateTaxV1(v1);
      if (result?.quarterlyPayment != null) {
        estimate = Math.round(result.quarterlyPayment);
      }
    } catch {
      // fall through to heuristic
    }
  }
  return estimate;
}
