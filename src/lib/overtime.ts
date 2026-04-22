/**
 * Overtime calculation — single source of truth.
 *
 * Standard daily-threshold OT (industry default for relief vet contracts):
 *   total_hours    = round_to_quarter((end - start) / 60)
 *   regular_hours  = min(total_hours, threshold)
 *   overtime_hours = max(0, total_hours - threshold)
 *   total          = regular_hours * hourly_rate + overtime_hours * overtime_rate
 *
 * No weekly OT / doubletime / 7th-day rules in v1.
 * No overnight-day-split — duration is treated per shift.
 */

import type { RateKind } from '@/types';

export interface OvertimePolicy {
  /** Hours per shift after which the OT rate kicks in. */
  threshold_hours: number;
  /** $/hr applied to hours beyond `threshold_hours`. */
  ot_rate: number;
}

export interface ShiftTotalInput {
  hours: number;
  hourly_rate: number;
  overtime_policy?: OvertimePolicy | null;
}

export interface ShiftTotalResult {
  regular_hours: number;
  overtime_hours: number;
  overtime_rate: number | null;
  total: number;
}

/** Round a number of hours to the nearest quarter hour (0.25). */
export function roundToQuarter(hours: number): number {
  return Math.round(hours * 4) / 4;
}

/** Round currency to two decimals (cents). */
function roundCents(n: number): number {
  return Math.round(n * 100) / 100;
}

/**
 * Compute the regular/overtime split and the total dollar amount for an
 * hourly shift. If no `overtime_policy` is provided (or it has no OT rate),
 * all hours are treated as regular.
 */
export function computeShiftTotal({
  hours,
  hourly_rate,
  overtime_policy,
}: ShiftTotalInput): ShiftTotalResult {
  const safeHours = Math.max(0, roundToQuarter(hours));
  const baseRate = Math.max(0, hourly_rate || 0);

  const policy = isOvertimePolicyActive(overtime_policy) ? overtime_policy : null;

  if (!policy) {
    return {
      regular_hours: safeHours,
      overtime_hours: 0,
      overtime_rate: null,
      total: roundCents(safeHours * baseRate),
    };
  }

  const threshold = Math.max(0, policy.threshold_hours);
  const regular_hours = roundToQuarter(Math.min(safeHours, threshold));
  const overtime_hours = roundToQuarter(Math.max(0, safeHours - threshold));
  const ot_rate = Math.max(0, policy.ot_rate || 0);
  const total = roundCents(regular_hours * baseRate + overtime_hours * ot_rate);

  return {
    regular_hours,
    overtime_hours,
    overtime_rate: overtime_hours > 0 ? ot_rate : null,
    total,
  };
}

/**
 * A policy is "active" only when both threshold and OT rate are usable
 * positive numbers. Empty / partially-filled policies behave as no-OT.
 */
export function isOvertimePolicyActive(
  policy: OvertimePolicy | null | undefined,
): policy is OvertimePolicy {
  if (!policy) return false;
  if (!Number.isFinite(policy.threshold_hours) || policy.threshold_hours <= 0) return false;
  if (!Number.isFinite(policy.ot_rate) || policy.ot_rate <= 0) return false;
  return true;
}

/**
 * Returns true only when this rate is hourly AND has an active OT policy.
 * Flat day-rates never trigger OT (out of scope per v1 plan).
 */
export function isOvertimeApplicable(kind: RateKind, policy: OvertimePolicy | null | undefined): boolean {
  return kind === 'hourly' && isOvertimePolicyActive(policy);
}
