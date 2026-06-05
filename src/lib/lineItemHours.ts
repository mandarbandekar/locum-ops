import { getBillableMinutes, formatBillableHours } from './shiftBreak';

export interface ShiftLike {
  start_datetime: string;
  end_datetime: string;
  break_minutes?: number | null;
  worked_through_break?: boolean | null;
}

export interface LineItemLike {
  qty: number;
  shift_id?: string | null;
  line_kind?: 'regular' | 'flat' | 'overtime' | string | null;
}

/**
 * Display string for the "Hours" column on invoice line items.
 * - Linked shift → billable hours from shift start/end (minus unpaid break).
 * - Overtime line → qty (already in hours).
 * - Standalone line with numeric qty likely meaning hours → qty.
 * - Otherwise → "—".
 */
export function formatLineHours(
  li: LineItemLike,
  shiftsById?: Record<string, ShiftLike | undefined> | null,
): string {
  if (li.shift_id && shiftsById) {
    const s = shiftsById[li.shift_id];
    if (s) return formatBillableHours(getBillableMinutes(s));
  }
  if (li.line_kind === 'overtime') {
    const q = Number(li.qty) || 0;
    return q > 0 ? formatBillableHours(q * 60) : '—';
  }
  // Standalone hourly-ish line (qty != 1, not flat): treat qty as hours.
  if (!li.shift_id && li.line_kind !== 'flat' && li.qty && li.qty !== 1) {
    return formatBillableHours((Number(li.qty) || 0) * 60);
  }
  return '—';
}
