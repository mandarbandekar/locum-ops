/**
 * Bi-directional sync between invoice line items and the underlying shift.
 *
 * When a user edits an hourly invoice line (regular or overtime) on a draft
 * invoice, the underlying shift row should mirror the change so the schedule,
 * tax nudges, and future auto-invoice drafts stay consistent.
 *
 * Pure helper — no DB calls. Caller is responsible for persisting the
 * returned shift patch via `updateShift(...)`.
 */

import type { Shift, InvoiceLineItem } from '@/types';
import { roundToQuarter } from '@/lib/overtime';

export interface ShiftPatchResult {
  /** Subset of fields to merge into the shift row. */
  patch: Partial<Shift> & { id: string };
  /** Human-readable summary for the activity log. */
  summary: string;
}

/**
 * Given a shift and the *current* set of line items linked to it (after the
 * user's edit/delete has been applied to the array), compute the updated
 * shift fields. Only call for hourly shifts (`rate_kind === 'hourly'`).
 */
export function syncShiftFromLineItems(
  shift: Shift,
  lines: Pick<InvoiceLineItem, 'line_kind' | 'qty' | 'unit_rate' | 'shift_id'>[],
): ShiftPatchResult | null {
  // Only sync hourly shifts. Flat/day-rate shifts bill as a single unit and
  // their hours are not derived from line qty.
  if (shift.rate_kind !== 'hourly') return null;

  const linkedLines = lines.filter(l => l.shift_id === shift.id);
  const regular = linkedLines.find(l => l.line_kind === 'regular');
  const overtime = linkedLines.find(l => l.line_kind === 'overtime');

  const regularHours = regular ? roundToQuarter(Number(regular.qty) || 0) : (shift.regular_hours ?? 0);
  const overtimeHours = overtime ? roundToQuarter(Number(overtime.qty) || 0) : 0;
  const hourlyRate = regular ? Number(regular.unit_rate) || 0 : (shift.hourly_rate ?? 0);
  const overtimeRate = overtime ? Number(overtime.unit_rate) || 0 : null;

  const totalHours = regularHours + overtimeHours;
  const start = new Date(shift.start_datetime);
  const newEnd = new Date(start.getTime() + totalHours * 60 * 60 * 1000);

  const rateApplied =
    Math.round((regularHours * hourlyRate + overtimeHours * (overtimeRate ?? 0)) * 100) / 100;

  const patch: Partial<Shift> & { id: string } = {
    id: shift.id,
    end_datetime: newEnd.toISOString(),
    regular_hours: regularHours,
    overtime_hours: overtimeHours,
    overtime_rate: overtimeHours > 0 ? overtimeRate : null,
    hourly_rate: hourlyRate,
    rate_applied: rateApplied,
  };

  const summary =
    overtimeHours > 0
      ? `Synced shift to invoice: ${regularHours}h regular + ${overtimeHours}h OT`
      : `Synced shift to invoice: ${regularHours}h`;

  return { patch, summary };
}

/** Whether shift sync should run for this invoice + line. */
export function canSyncShiftForLine(
  invoiceStatus: string,
  lineKind: string | undefined,
  shiftId: string | null | undefined,
): boolean {
  if (!shiftId) return false;
  if (invoiceStatus !== 'draft') return false;
  if (lineKind !== 'regular' && lineKind !== 'overtime') return false;
  return true;
}
