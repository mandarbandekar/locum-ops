/**
 * Bi-directional sync between an hourly invoice line item and the underlying shift.
 *
 * When a user edits the hours (qty) or rate on a draft invoice line that came
 * from an hourly shift, mirror the change back to the shift so the schedule,
 * tax nudges, and future auto-invoice drafts stay consistent.
 *
 * Pure helper — no DB calls. Caller persists the returned shift patch.
 */

import type { Shift, InvoiceLineItem } from '@/types';

export interface ShiftPatchResult {
  patch: Partial<Shift> & { id: string };
  summary: string;
}

/** Round a number of hours to the nearest quarter hour (0.25). */
function roundToQuarter(hours: number): number {
  return Math.round(hours * 4) / 4;
}

/**
 * Given a shift and the *current* set of line items linked to it, compute the
 * updated shift fields. Only call for hourly shifts (`rate_kind === 'hourly'`).
 */
export function syncShiftFromLineItems(
  shift: Shift,
  lines: Pick<InvoiceLineItem, 'line_kind' | 'qty' | 'unit_rate' | 'shift_id'>[],
): ShiftPatchResult | null {
  if (shift.rate_kind !== 'hourly') return null;

  const linkedLines = lines.filter(l => l.shift_id === shift.id);
  const regular = linkedLines.find(l => l.line_kind === 'regular') ?? linkedLines[0];
  if (!regular) return null;

  const hours = roundToQuarter(Number(regular.qty) || 0);
  const hourlyRate = Number(regular.unit_rate) || (shift.hourly_rate ?? 0);

  const start = new Date(shift.start_datetime);
  const newEnd = new Date(start.getTime() + hours * 60 * 60 * 1000);
  const rateApplied = Math.round(hours * hourlyRate * 100) / 100;

  // When the user edits invoice hours directly, treat the new value as both
  // the scheduled and billable duration: zero out break_minutes so future
  // recalculations can't double-deduct it.
  const patch: Partial<Shift> & { id: string } = {
    id: shift.id,
    end_datetime: newEnd.toISOString(),
    hourly_rate: hourlyRate,
    rate_applied: rateApplied,
    break_minutes: 0,
    worked_through_break: false,
  };

  return { patch, summary: `Synced shift to invoice: ${hours}h` };
}

/** Whether shift sync should run for this invoice + line. */
export function canSyncShiftForLine(
  invoiceStatus: string,
  lineKind: string | undefined,
  shiftId: string | null | undefined,
): boolean {
  if (!shiftId) return false;
  if (invoiceStatus !== 'draft') return false;
  if (lineKind !== 'regular') return false;
  return true;
}
