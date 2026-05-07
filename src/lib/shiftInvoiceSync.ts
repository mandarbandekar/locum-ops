/**
 * Bi-directional sync between invoice line items and the underlying shift.
 *
 * Source of truth = the invoice line. When a user edits the hours (qty), rate,
 * or adds/removes an overtime line on a draft invoice, mirror the change back
 * to the shift so the schedule, dashboard revenue, and tax nudges stay in sync.
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
 * updated shift fields. Handles regular/flat lines + an optional overtime line.
 */
export function syncShiftFromLineItems(
  shift: Shift,
  lines: Pick<InvoiceLineItem, 'line_kind' | 'qty' | 'unit_rate' | 'shift_id'>[],
): ShiftPatchResult | null {
  const linkedLines = lines.filter(l => l.shift_id === shift.id);
  const overtimeLine = linkedLines.find(l => l.line_kind === 'overtime');
  const baseLine = linkedLines.find(l => l.line_kind !== 'overtime') ?? linkedLines.find(l => l.line_kind !== 'overtime');

  const patch: Partial<Shift> & { id: string } = { id: shift.id };
  let summaryParts: string[] = [];

  // Mirror overtime fields (or clear them if line was removed).
  const newOtHours = overtimeLine ? Math.max(0, Number(overtimeLine.qty) || 0) : 0;
  const newOtRate = overtimeLine ? Math.max(0, Number(overtimeLine.unit_rate) || 0) : 0;
  if ((shift.overtime_hours ?? 0) !== newOtHours || (shift.overtime_rate ?? 0) !== newOtRate) {
    patch.overtime_hours = newOtHours;
    patch.overtime_rate = newOtRate;
    summaryParts.push(newOtHours > 0
      ? `overtime ${newOtHours}h × $${newOtRate}`
      : 'overtime cleared');
  }

  // Hourly base line: also mirror duration + hourly rate back to the shift.
  if (shift.rate_kind === 'hourly' && baseLine && baseLine.line_kind !== 'overtime') {
    const hours = roundToQuarter(Number(baseLine.qty) || 0);
    const hourlyRate = Number(baseLine.unit_rate) || (shift.hourly_rate ?? 0);
    const start = new Date(shift.start_datetime);
    const newEnd = new Date(start.getTime() + hours * 60 * 60 * 1000);
    const rateApplied = Math.round(hours * hourlyRate * 100) / 100;
    patch.end_datetime = newEnd.toISOString();
    patch.hourly_rate = hourlyRate;
    patch.rate_applied = rateApplied;
    patch.break_minutes = 0;
    patch.worked_through_break = false;
    summaryParts.unshift(`shift to ${hours}h`);
  }

  if (Object.keys(patch).length <= 1) return null; // only id
  return { patch, summary: `Synced ${summaryParts.join(', ')}` };
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
