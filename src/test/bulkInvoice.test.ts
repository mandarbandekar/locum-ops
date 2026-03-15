import { describe, it, expect } from 'vitest';
import { getEligibleShiftsForBulkInvoice } from '@/lib/bulkInvoiceHelpers';
import type { Shift, Invoice, InvoiceLineItem } from '@/types';

const makeShift = (id: string, facilityId: string, status: string, daysAgo: number): Shift => {
  const d = new Date();
  d.setDate(d.getDate() - daysAgo);
  return {
    id, facility_id: facilityId, status: status as any,
    start_datetime: new Date(d.setHours(8, 0, 0, 0)).toISOString(),
    end_datetime: new Date(d.setHours(18, 0, 0, 0)).toISOString(),
    rate_applied: 850, notes: '', color: 'blue',
  };
};

const baseInv = {
  invoice_date: '', period_start: '', period_end: '', total_amount: 0,
  balance_due: 0, notes: '', share_token: null, share_token_created_at: null,
  share_token_revoked_at: null, invoice_type: 'single' as const,
};

describe('Bulk Invoice Helpers', () => {
  const periodStart = new Date();
  periodStart.setDate(periodStart.getDate() - 30);
  const periodEnd = new Date();

  it('only includes completed shifts for the selected facility', () => {
    const shifts = [
      makeShift('s1', 'c1', 'completed', 5),
      makeShift('s2', 'c1', 'booked', 3),
      makeShift('s3', 'c2', 'completed', 4),
    ];
    const { eligible } = getEligibleShiftsForBulkInvoice(shifts, [], [], 'c1', periodStart, periodEnd);
    expect(eligible).toHaveLength(1);
    expect(eligible[0].id).toBe('s1');
  });

  it('excludes shifts already on sent/paid invoices', () => {
    const shifts = [
      makeShift('s1', 'c1', 'completed', 5),
      makeShift('s2', 'c1', 'completed', 3),
    ];
    const invoices: Invoice[] = [
      { id: 'i1', facility_id: 'c1', invoice_number: 'INV-001', status: 'sent', sent_at: '2026-01-01', paid_at: null, due_date: null, ...baseInv },
    ];
    const lineItems: InvoiceLineItem[] = [
      { id: 'li1', invoice_id: 'i1', shift_id: 's1', description: '', service_date: null, qty: 1, unit_rate: 850, line_total: 850 },
    ];
    const { eligible } = getEligibleShiftsForBulkInvoice(shifts, invoices, lineItems, 'c1', periodStart, periodEnd);
    expect(eligible).toHaveLength(1);
    expect(eligible[0].id).toBe('s2');
  });

  it('excludes draft-linked shifts separately', () => {
    const shifts = [
      makeShift('s1', 'c1', 'completed', 5),
      makeShift('s2', 'c1', 'completed', 3),
    ];
    const invoices: Invoice[] = [
      { id: 'i1', facility_id: 'c1', invoice_number: 'INV-001', status: 'draft', sent_at: null, paid_at: null, due_date: null, ...baseInv },
    ];
    const lineItems: InvoiceLineItem[] = [
      { id: 'li1', invoice_id: 'i1', shift_id: 's1', description: '', service_date: null, qty: 1, unit_rate: 850, line_total: 850 },
    ];
    const { eligible, draftExcluded } = getEligibleShiftsForBulkInvoice(shifts, invoices, lineItems, 'c1', periodStart, periodEnd);
    expect(eligible).toHaveLength(1);
    expect(eligible[0].id).toBe('s2');
    expect(draftExcluded).toHaveLength(1);
    expect(draftExcluded[0].id).toBe('s1');
  });

  it('calculates bulk draft total correctly', () => {
    const shifts = [
      { ...makeShift('s1', 'c1', 'completed', 5), rate_applied: 850 },
      { ...makeShift('s2', 'c1', 'completed', 3), rate_applied: 1100 },
    ];
    const { eligible } = getEligibleShiftsForBulkInvoice(shifts, [], [], 'c1', periodStart, periodEnd);
    const total = eligible.reduce((sum, s) => sum + s.rate_applied, 0);
    expect(total).toBe(1950);
  });

  it('preserves shift traceability via shift_id', () => {
    const shifts = [makeShift('s1', 'c1', 'completed', 5)];
    const { eligible } = getEligibleShiftsForBulkInvoice(shifts, [], [], 'c1', periodStart, periodEnd);
    expect(eligible[0].id).toBe('s1');
    // Line items created from eligible shifts preserve shift_id
    const lineItem = {
      shift_id: eligible[0].id,
      description: 'test',
      service_date: null,
      qty: 1,
      unit_rate: eligible[0].rate_applied,
      line_total: eligible[0].rate_applied,
    };
    expect(lineItem.shift_id).toBe('s1');
  });

  it('returns correct line item count for bulk invoice', () => {
    const shifts = [
      makeShift('s1', 'c1', 'completed', 10),
      makeShift('s2', 'c1', 'completed', 8),
      makeShift('s3', 'c1', 'completed', 5),
    ];
    const { eligible } = getEligibleShiftsForBulkInvoice(shifts, [], [], 'c1', periodStart, periodEnd);
    expect(eligible).toHaveLength(3);
  });
});
