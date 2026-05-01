/**
 * Shift break handling — single source of truth for billable vs scheduled time.
 *
 * Semantics:
 *   - break_minutes === null  → break is paid (no deduction). Default for legacy data.
 *   - break_minutes === 0     → no break taken (no deduction).
 *   - break_minutes > 0       → unpaid break, deducted from billable time.
 *   - worked_through_break === true → ignore break_minutes; full scheduled time billable.
 *
 * For flat-rate shifts the dollar amount is unchanged — only hourly invoice
 * math uses billable minutes. Hours-worked metrics use billable minutes for
 * ALL rate types.
 */

export interface BreakBearingShift {
  start_datetime: string;
  end_datetime: string;
  break_minutes?: number | null;
  worked_through_break?: boolean | null;
}

/** Total scheduled minutes between start and end. Always non-negative.
 *  If end <= start (legacy overnight rows that weren't rolled to next day),
 *  treat the shift as crossing midnight and add 24h to end. */
export function getScheduledMinutes(shift: Pick<BreakBearingShift, 'start_datetime' | 'end_datetime'>): number {
  const start = new Date(shift.start_datetime).getTime();
  let end = new Date(shift.end_datetime).getTime();
  if (!Number.isFinite(start) || !Number.isFinite(end)) return 0;
  if (end <= start) end += 24 * 60 * 60 * 1000;
  return Math.max(0, Math.round((end - start) / 60000));
}

/** Billable minutes after applying break / override rules. */
export function getBillableMinutes(shift: BreakBearingShift): number {
  const scheduled = getScheduledMinutes(shift);
  if (shift.worked_through_break) return scheduled;
  const br = shift.break_minutes;
  if (br == null || br <= 0) return scheduled;
  return Math.max(0, scheduled - br);
}

/** Hours, decimal with one place (e.g. 7.3, 8, 9.5). */
export function formatBillableHours(minutes: number): string {
  const hours = minutes / 60;
  // Whole numbers stay whole (e.g. "8"); otherwise 1 decimal.
  if (Number.isInteger(hours)) return hours.toString();
  return (Math.round(hours * 10) / 10).toString();
}

/** Formats minutes as H:MM (e.g. 90 → "1:30"). */
export function formatHoursMinutes(minutes: number): string {
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  return `${h}:${m.toString().padStart(2, '0')}`;
}

/** Human label for a clinic / shift break-minutes value. */
export function getBreakPolicyLabel(breakMinutes: number | null | undefined): string {
  if (breakMinutes == null) return 'Paid (no deduction)';
  if (breakMinutes === 0) return 'Paid (no deduction)';
  if (breakMinutes === 30) return 'Unpaid 30 min';
  if (breakMinutes === 60) return 'Unpaid 60 min';
  return `Custom (${breakMinutes} min)`;
}

/** Whether the shift has an unpaid deduction worth surfacing on detail views. */
export function hasUnpaidBreakDeduction(shift: BreakBearingShift): boolean {
  if (shift.worked_through_break) return false;
  return (shift.break_minutes ?? 0) > 0;
}

/** Helper for invoice line item description suffix. */
export function billableHoursLabel(shift: BreakBearingShift): string {
  return formatBillableHours(getBillableMinutes(shift));
}

/**
 * Parenthetical for shift detail / invoice line views.
 * Returns null when no unpaid break applies.
 * Example: "incl. 30 min unpaid break"
 */
export function unpaidBreakParenthetical(shift: BreakBearingShift): string | null {
  if (!hasUnpaidBreakDeduction(shift)) return null;
  return `incl. ${shift.break_minutes} min unpaid break`;
}

/** Release date for the shift-break feature. NEW pill auto-hides 30 days after. */
export const BREAK_FEATURE_RELEASE_DATE = new Date('2026-04-27');

export function isBreakFeatureNew(now: Date = new Date()): boolean {
  const cutoff = new Date(BREAK_FEATURE_RELEASE_DATE);
  cutoff.setDate(cutoff.getDate() + 30);
  return now.getTime() <= cutoff.getTime();
}
