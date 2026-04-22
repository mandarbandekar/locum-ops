import { describe, it, expect } from 'vitest';
import { syncShiftFromLineItems, canSyncShiftForLine } from '@/lib/shiftInvoiceSync';
import type { Shift, InvoiceLineItem } from '@/types';

const baseShift: Shift = {
  id: 'shift-1',
  facility_id: 'fac-1',
  start_datetime: '2026-04-20T15:00:00.000Z', // 8am PT
  end_datetime: '2026-04-20T23:00:00.000Z',   // +8h
  rate_applied: 800,
  notes: '',
  color: 'blue',
  rate_kind: 'hourly',
  hourly_rate: 100,
  regular_hours: 8,
  overtime_hours: 0,
  overtime_rate: null,
};

const line = (overrides: Partial<InvoiceLineItem>): InvoiceLineItem => ({
  id: 'l1',
  invoice_id: 'inv1',
  shift_id: 'shift-1',
  description: '',
  service_date: '2026-04-20',
  qty: 8,
  unit_rate: 100,
  line_total: 800,
  line_kind: 'regular',
  ...overrides,
});

describe('syncShiftFromLineItems', () => {
  it('updates end_datetime when regular qty changes 8h → 10h', () => {
    const lines = [line({ qty: 10, line_total: 1000 })];
    const result = syncShiftFromLineItems(baseShift, lines)!;
    expect(result.patch.regular_hours).toBe(10);
    expect(result.patch.overtime_hours).toBe(0);
    expect(new Date(result.patch.end_datetime!).getTime() - new Date(baseShift.start_datetime).getTime())
      .toBe(10 * 60 * 60 * 1000);
    expect(result.patch.rate_applied).toBe(1000);
  });

  it('preserves regular hours when only OT line changes', () => {
    const lines = [
      line({ id: 'r', qty: 8, line_kind: 'regular', line_total: 800 }),
      line({ id: 'o', qty: 2, unit_rate: 150, line_kind: 'overtime', line_total: 300 }),
    ];
    const result = syncShiftFromLineItems(baseShift, lines)!;
    expect(result.patch.regular_hours).toBe(8);
    expect(result.patch.overtime_hours).toBe(2);
    expect(result.patch.overtime_rate).toBe(150);
    expect(result.patch.rate_applied).toBe(8 * 100 + 2 * 150);
    // end_datetime = start + 10h
    expect(new Date(result.patch.end_datetime!).getTime() - new Date(baseShift.start_datetime).getTime())
      .toBe(10 * 60 * 60 * 1000);
  });

  it('zeroes OT fields when overtime line is removed', () => {
    const shiftWithOT: Shift = { ...baseShift, overtime_hours: 2, overtime_rate: 150 };
    const lines = [line({ qty: 8, line_kind: 'regular' })]; // OT line removed
    const result = syncShiftFromLineItems(shiftWithOT, lines)!;
    expect(result.patch.overtime_hours).toBe(0);
    expect(result.patch.overtime_rate).toBe(null);
    expect(result.patch.regular_hours).toBe(8);
  });

  it('returns null for flat (non-hourly) shifts', () => {
    const flat: Shift = { ...baseShift, rate_kind: 'flat' };
    expect(syncShiftFromLineItems(flat, [line({})])).toBeNull();
  });
});

describe('canSyncShiftForLine', () => {
  it('blocks sync for non-draft invoices', () => {
    expect(canSyncShiftForLine('sent', 'regular', 's1')).toBe(false);
    expect(canSyncShiftForLine('paid', 'overtime', 's1')).toBe(false);
  });
  it('allows sync for draft regular/overtime lines with shift_id', () => {
    expect(canSyncShiftForLine('draft', 'regular', 's1')).toBe(true);
    expect(canSyncShiftForLine('draft', 'overtime', 's1')).toBe(true);
  });
  it('blocks sync for custom/flat lines or missing shift_id', () => {
    expect(canSyncShiftForLine('draft', 'flat', 's1')).toBe(false);
    expect(canSyncShiftForLine('draft', undefined, 's1')).toBe(false);
    expect(canSyncShiftForLine('draft', 'regular', null)).toBe(false);
  });
});
